/**
 * @researcher Chat Participant Handler
 *
 * Handles natural language requests in GitHub Copilot Chat.
 * Supports slash commands: /find, /download, /render, /workflow
 *
 * The participant acts as a security research assistant, helping
 * users discover papers, download PDFs, extract screenshots, and
 * generate analysis with Mermaid diagrams.
 */

import * as vscode from "vscode";

/** System prompt that defines the @researcher persona and capabilities. */
const SYSTEM_PROMPT = `You are a Security Research Assistant for BSides Ballarat 2026.
You help security researchers discover, download, render, and analyse academic papers about cybersecurity topics.

Your capabilities:
1. **Discover** — Search for academic papers using the Semantic Scholar MCP server (available as a separate MCP tool).
2. **Acquire** — Download PDFs from arXiv using the bsides-researcher_downloadArxivPaper tool.
3. **Render** — Extract page screenshots from PDFs using the bsides-researcher_screenshotPdf tool.
4. **Analyse** — Analyse paper content and generate Mermaid diagrams for attack flows, defense architectures, etc.
5. **Visualise** — Create Markdown files with Mermaid code blocks for visual documentation.

When a user asks about a security topic:
- Suggest relevant arXiv paper IDs if you know them.
- Offer to download and render papers.
- When analysing, produce Mermaid diagrams (flowchart, sequence, or graph) to visualise attack/defense patterns.

Always use kebab-case for filenames (e.g., "prompt-injection-defense.pdf").
Papers are saved to the papers/ directory and screenshots to PDF-Screenshots/.`;

/**
 * Handle incoming chat requests to @researcher.
 */
export async function handleResearcherRequest(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  // Route based on slash command
  switch (request.command) {
    case "find":
      return handleFind(request, context, stream, token);
    case "download":
      return handleDownload(request, context, stream, token);
    case "render":
      return handleRender(request, context, stream, token);
    case "workflow":
      return handleWorkflow(request, context, stream, token);
    default:
      return handleGeneral(request, context, stream, token);
  }
}

/**
 * Handle /find — search for papers on a topic.
 *
 * Guides the user to use Semantic Scholar MCP and provides context
 * about available tools.
 */
async function handleFind(
  request: vscode.ChatRequest,
  _context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  const topic = request.prompt.trim();

  if (!topic) {
    stream.markdown(
      "Please provide a topic to search for. Example:\n\n" +
        "`@researcher /find prompt injection defenses`"
    );
    return {};
  }

  // Use the LLM to respond about the topic with awareness of available tools
  return sendToModel(
    `The user wants to find academic papers about: "${topic}".

Help them by:
1. Suggesting they use the Semantic Scholar MCP tool (search_papers) to search for papers on this topic.
2. If you know specific relevant arXiv paper IDs on this topic, list them with titles.
3. Remind them they can use @researcher /download <arxivId> to download any paper.

Be specific and helpful. Focus on security research.`,
    request,
    stream,
    token
  );
}

/**
 * Handle /download — download a paper from arXiv.
 *
 * Invokes the downloadArxivPaper LM tool directly.
 */
async function handleDownload(
  request: vscode.ChatRequest,
  _context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  const prompt = request.prompt.trim();

  // Try to extract an arXiv ID from the prompt
  const arxivIdMatch = prompt.match(/\d{4}\.\d{4,5}(v\d+)?/);

  if (!arxivIdMatch) {
    stream.markdown(
      "Please provide an arXiv ID. Example:\n\n" +
        "`@researcher /download 2502.05174 melon-provable-defense`\n\n" +
        "Format: `/download <arxivId> [optional-filename]`"
    );
    return {};
  }

  const arxivId = arxivIdMatch[0];

  // Try to extract a filename from the remaining text
  const remainingText = prompt.replace(arxivId, "").trim();
  const filename = remainingText || undefined;

  stream.progress(`Downloading arXiv:${arxivId}…`);

  try {
    const result = await vscode.lm.invokeTool(
      "bsides-researcher_downloadArxivPaper",
      {
        input: { arxivId, filename },
        toolInvocationToken: request.toolInvocationToken,
      },
      token
    );

    // Extract text from the tool result
    for (const part of result.content) {
      if (part instanceof vscode.LanguageModelTextPart) {
        stream.markdown(part.value);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stream.markdown(`**Error:** ${message}`);
  }

  return {};
}

/**
 * Handle /render — extract screenshots from a PDF.
 *
 * Invokes the screenshotPdf LM tool directly.
 */
async function handleRender(
  request: vscode.ChatRequest,
  _context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  const pdfPath = request.prompt.trim();

  if (!pdfPath) {
    stream.markdown(
      "Please provide the path to a PDF file. Example:\n\n" +
        "`@researcher /render papers/melon-provable-defense.pdf`"
    );
    return {};
  }

  stream.progress(`Extracting screenshots from ${pdfPath}…`);

  try {
    const result = await vscode.lm.invokeTool(
      "bsides-researcher_screenshotPdf",
      {
        input: { pdfPath },
        toolInvocationToken: request.toolInvocationToken,
      },
      token
    );

    for (const part of result.content) {
      if (part instanceof vscode.LanguageModelTextPart) {
        stream.markdown(part.value);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stream.markdown(`**Error:** ${message}`);
  }

  return {};
}

/**
 * Handle /workflow — full pipeline: search → download → render → analyse.
 *
 * Orchestrates all steps in sequence using the LLM for analysis.
 */
async function handleWorkflow(
  request: vscode.ChatRequest,
  _context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  const prompt = request.prompt.trim();

  if (!prompt) {
    stream.markdown(
      "Please describe what you want to research. Example:\n\n" +
        "`@researcher /workflow find and analyse papers on prompt injection defenses`"
    );
    return {};
  }

  return sendToModel(
    `The user wants to run a full research workflow: "${prompt}".

Guide them through the complete pipeline:
1. **Discover** — Suggest using Semantic Scholar MCP (search_papers tool) to find relevant papers.
2. **Acquire** — Once papers are found, they can use @researcher /download <arxivId> <filename> to download PDFs.
3. **Render** — After downloading, use @researcher /render papers/<filename>.pdf to extract screenshots.
4. **Analyse** — Attach the screenshots to Copilot Chat for multimodal analysis.
5. **Visualise** — Generate Mermaid diagrams for attack/defense flows.

Walk them through step by step. Be specific about commands they should run.`,
    request,
    stream,
    token
  );
}

/**
 * Handle general (no slash command) requests.
 */
async function handleGeneral(
  request: vscode.ChatRequest,
  _context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  return sendToModel(request.prompt, request, stream, token);
}

/**
 * Send a prompt to the language model and stream the response to chat.
 */
async function sendToModel(
  userPrompt: string,
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  // Select a model (prefer GPT-4o or any available copilot model)
  const [model] = await vscode.lm.selectChatModels({
    vendor: "copilot",
    family: "gpt-4o",
  });

  if (!model) {
    stream.markdown(
      "No language model available. Please ensure GitHub Copilot is active."
    );
    return {};
  }

  const messages = [
    vscode.LanguageModelChatMessage.User(SYSTEM_PROMPT),
    vscode.LanguageModelChatMessage.User(userPrompt),
  ];

  // Include available tools so the model can call them
  const tools: vscode.LanguageModelChatTool[] = [
    {
      name: "bsides-researcher_downloadArxivPaper",
      description:
        "Download a PDF from arXiv given an arXiv ID and save it to the papers/ directory.",
      inputSchema: {
        type: "object",
        properties: {
          arxivId: {
            type: "string",
            description: "The arXiv paper ID (e.g., '2502.05174')",
          },
          filename: {
            type: "string",
            description: "Optional kebab-case filename without extension",
          },
        },
        required: ["arxivId"],
      },
    },
    {
      name: "bsides-researcher_screenshotPdf",
      description:
        "Extract all pages of a PDF as PNG screenshots using PDF Toolkit.",
      inputSchema: {
        type: "object",
        properties: {
          pdfPath: {
            type: "string",
            description:
              "Workspace-relative path to the PDF (e.g., 'papers/melon.pdf')",
          },
        },
        required: ["pdfPath"],
      },
    },
  ];

  try {
    const response = await model.sendRequest(messages, { tools }, token);

    // Process the response stream — handle both text and tool calls
    for await (const part of response.stream) {
      if (part instanceof vscode.LanguageModelTextPart) {
        stream.markdown(part.value);
      } else if (part instanceof vscode.LanguageModelToolCallPart) {
        // The model wants to call one of our tools
        stream.progress(`Calling tool: ${part.name}…`);

        try {
          const toolResult = await vscode.lm.invokeTool(
            part.name,
            {
              input: part.input,
              toolInvocationToken: request.toolInvocationToken,
            },
            token
          );

          // Show tool results in the chat
          for (const resultPart of toolResult.content) {
            if (resultPart instanceof vscode.LanguageModelTextPart) {
              stream.markdown("\n\n" + resultPart.value);
            }
          }
        } catch (toolError) {
          const msg =
            toolError instanceof Error
              ? toolError.message
              : String(toolError);
          stream.markdown(`\n\n**Tool error:** ${msg}`);
        }
      }
    }
  } catch (error) {
    if (error instanceof vscode.LanguageModelError) {
      stream.markdown(`**Model error:** ${error.message}`);
    } else {
      throw error;
    }
  }

  return {};
}
