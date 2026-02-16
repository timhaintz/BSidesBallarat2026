/**
 * @bsides-researcher Chat Participant Handler
 *
 * Handles natural language requests in GitHub Copilot Chat.
 * Supports slash commands: /find, /download, /render, /workflow
 *
 * The participant acts as a research assistant, helping
 * users discover papers, download PDFs, extract screenshots, and
 * generate analysis with Mermaid diagrams.
 */

import * as vscode from "vscode";

/**
 * Determine the MIME type for common image extensions.
 */
function imageMime(fsPath: string): string | undefined {
  const ext = fsPath.toLowerCase().split(".").pop();
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
  };
  return ext ? map[ext] : undefined;
}

/**
 * Build LM content parts from the user's `#file:` references.
 *
 * - Image files (PNG, JPEG, etc.) → `LanguageModelDataPart.image()`
 * - Text / other files → `LanguageModelTextPart` with file content
 *
 * Returns an array that can be spread into the user message parts.
 */
async function buildReferenceParts(
  references: readonly vscode.ChatPromptReference[]
): Promise<Array<vscode.LanguageModelTextPart | vscode.LanguageModelDataPart>> {
  const parts: Array<vscode.LanguageModelTextPart | vscode.LanguageModelDataPart> = [];

  for (const ref of references) {
    // Resolve the URI from the reference value
    let uri: vscode.Uri | undefined;
    if (ref.value instanceof vscode.Uri) {
      uri = ref.value;
    } else if (ref.value instanceof vscode.Location) {
      uri = ref.value.uri;
    }
    if (!uri) {
      continue;
    }

    const mime = imageMime(uri.fsPath);

    // Use the last path segment as a human-readable label
    const label = uri.fsPath.split(/[\\/]/).pop() ?? ref.id;

    if (mime) {
      // Image file — include as binary data for multimodal analysis
      try {
        const data = await vscode.workspace.fs.readFile(uri);
        parts.push(new vscode.LanguageModelTextPart(`[Image: ${label}]`));
        parts.push(vscode.LanguageModelDataPart.image(data, mime));
      } catch {
        parts.push(
          new vscode.LanguageModelTextPart(`[Could not read image: ${label}]`)
        );
      }
    } else {
      // Text / other file — include content inline
      try {
        const data = await vscode.workspace.fs.readFile(uri);
        const content = new TextDecoder().decode(data);
        parts.push(
          new vscode.LanguageModelTextPart(
            `\n\n--- Content of ${label} ---\n${content}\n---\n`
          )
        );
      } catch {
        parts.push(
          new vscode.LanguageModelTextPart(`[Could not read file: ${label}]`)
        );
      }
    }
  }

  return parts;
}

/** System prompt that defines the @bsides-researcher persona and capabilities. */
const SYSTEM_PROMPT = `You are a Research Assistant for BSides Ballarat 2026.
You help researchers discover, download, render, and analyse academic papers on any topic, with a focus on cybersecurity.

You MUST actively use your tools to perform actions — do not just describe steps for the user to run manually.

Your tools and how to use them:
1. **Discover** — Use Semantic Scholar tools (e.g. mcp_semanticschol_search_papers) to search for papers. CALL the tool directly, do not just suggest the user run it.
2. **Acquire** — Use bsides-researcher_downloadArxivPaper to download PDFs from arXiv. Always provide a descriptive kebab-case filename.
3. **Render** — Use bsides-researcher_screenshotPdf to extract page screenshots from downloaded PDFs.
4. **Analyse** — When the user attaches images via #file: references, analyse their content in detail. Produce Mermaid diagrams (flowchart, sequence, or graph) to visualise attack/defense patterns.
5. **Save** — Use bsides-researcher_saveMarkdown to save analysis results as a Markdown file in the papers/ directory.

CRITICAL RULES:
- ALWAYS call tools directly. Never tell the user to run a command themselves when you have a tool that can do it.
- When searching for papers, call the search tool — do not just suggest the user call it.
- After downloading papers, proceed to render them automatically.
- After rendering, offer to analyse the screenshots.
- After analysing, save the results as a Markdown file using bsides-researcher_saveMarkdown.
- Use kebab-case for all filenames (e.g., "prompt-injection-defense.pdf").
- Papers are saved to the papers/ directory and screenshots to PDF-Screenshots/.
- When you already know relevant arXiv IDs for a topic, include them AND also search to find more.`;

/**
 * Handle incoming chat requests to @bsides-researcher.
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
        "`@bsides-researcher /find prompt injection defenses`"
    );
    return {};
  }

  // Use the LLM to respond about the topic with awareness of available tools
  return sendToModel(
    `The user wants to find academic papers about: "${topic}".

You MUST:
1. Call the Semantic Scholar search tool (e.g. mcp_semanticschol_search_papers) to search for papers on this topic. Do NOT just tell the user to run it — call it yourself.
2. Also list any relevant arXiv paper IDs you already know, with titles.
3. After presenting results, offer to download the most relevant papers immediately.

Be specific and helpful. Execute the search now.`,
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
        "`@bsides-researcher /download 2502.05174 melon-provable-defense`\n\n" +
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
        "`@bsides-researcher /render papers/melon-provable-defense.pdf`"
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
        "`@bsides-researcher /workflow find and analyse papers on prompt injection defenses`"
    );
    return {};
  }

  return sendToModel(
    `The user wants to run a full research workflow on: "${prompt}".

Execute the COMPLETE pipeline using your tools. Do NOT just describe steps — CALL the tools:

1. **Discover** — CALL the Semantic Scholar search tool (e.g. mcp_semanticschol_search_papers) to find papers on this topic. Also list any arXiv IDs you already know.
2. **Acquire** — CALL bsides-researcher_downloadArxivPaper to download the most relevant papers (2-4 papers). Use descriptive kebab-case filenames.
3. **Render** — CALL bsides-researcher_screenshotPdf for each downloaded PDF to extract page screenshots.
4. **Analyse** — Summarise the key findings from the papers. Create Mermaid diagrams for attack flows, defence architectures, and comparison matrices.
5. **Save** — CALL bsides-researcher_saveMarkdown to save the full analysis (including Mermaid diagrams) as a Markdown file in papers/.

Proceed through each step automatically. After each tool call, use the results to inform the next step.`,
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
 * Metadata key used to communicate screenshotted paper directories
 * from sendToModel → ChatFollowupProvider.
 */
export interface ResearcherResultMetadata {
  /** Workspace-relative directories containing extracted screenshots. */
  screenshotDirs?: string[];
}

/**
 * Send a prompt to the language model and stream the response to chat.
 *
 * Implements an agentic tool-calling loop: the model can call tools,
 * and the results are fed back into the conversation so the model
 * can use them for subsequent decisions (e.g., using filenames from
 * a download result to call the screenshot tool).
 */
async function sendToModel(
  userPrompt: string,
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  // Select any available Copilot model (don't hardcode a family)
  const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
  const model = models[0];

  if (!model) {
    stream.markdown(
      "No language model available. Please ensure GitHub Copilot is active."
    );
    return {};
  }

  // Build the user message — include any #file: references (images, text)
  const userParts: Array<
    vscode.LanguageModelTextPart | vscode.LanguageModelDataPart
  > = [new vscode.LanguageModelTextPart(userPrompt)];

  if (request.references.length > 0) {
    const refParts = await buildReferenceParts(request.references);
    userParts.push(...refParts);
  }

  const messages: vscode.LanguageModelChatMessage[] = [
    vscode.LanguageModelChatMessage.User(SYSTEM_PROMPT),
    vscode.LanguageModelChatMessage.User(userParts),
  ];

  // Pass ALL available LM tools (including MCP tools like Semantic Scholar)
  // so the model can call them directly instead of just suggesting the user run them.
  const tools: vscode.LanguageModelChatTool[] = vscode.lm.tools.map(
    (tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })
  );

  // Agentic tool-calling loop: send → collect tool calls → execute →
  // feed results back → let the model continue until it has no more calls.
  const MAX_TOOL_ROUNDS = 10;

  // Track screenshot directories for followup suggestions
  const screenshotDirs: string[] = [];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await model.sendRequest(messages, { tools }, token);

      // Collect all parts from the response stream
      const textParts: string[] = [];
      const toolCalls: vscode.LanguageModelToolCallPart[] = [];

      for await (const part of response.stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
          stream.markdown(part.value);
          textParts.push(part.value);
        } else if (part instanceof vscode.LanguageModelToolCallPart) {
          toolCalls.push(part);
        }
      }

      // If no tool calls were made, the model is done
      if (toolCalls.length === 0) {
        break;
      }

      // Build the assistant message containing text + tool call parts
      const assistantParts: (
        | vscode.LanguageModelTextPart
        | vscode.LanguageModelToolCallPart
      )[] = [];
      if (textParts.length > 0) {
        assistantParts.push(
          new vscode.LanguageModelTextPart(textParts.join(""))
        );
      }
      assistantParts.push(...toolCalls);
      messages.push(
        vscode.LanguageModelChatMessage.Assistant(assistantParts)
      );

      // Execute each tool call and collect results
      const toolResultParts: vscode.LanguageModelToolResultPart[] = [];

      for (const toolCall of toolCalls) {
        stream.progress(`Calling tool: ${toolCall.name}…`);

        try {
          const toolResult = await vscode.lm.invokeTool(
            toolCall.name,
            {
              input: toolCall.input,
              toolInvocationToken: request.toolInvocationToken,
            },
            token
          );

          // Show tool results in the chat
          for (const resultPart of toolResult.content) {
            if (resultPart instanceof vscode.LanguageModelTextPart) {
              stream.markdown("\n\n" + resultPart.value);

              // Track screenshot directories for followup suggestions
              if (
                toolCall.name === "bsides-researcher_screenshotPdf" &&
                resultPart.value.includes("PDF-Screenshots/")
              ) {
                const dirMatch = resultPart.value.match(
                  /PDF-Screenshots\/([^\s/]+)\//
                );
                if (dirMatch) {
                  screenshotDirs.push(`PDF-Screenshots/${dirMatch[1]}`);
                }
              }
            }
          }

          // Feed the result back to the model
          toolResultParts.push(
            new vscode.LanguageModelToolResultPart(
              toolCall.callId,
              toolResult.content
            )
          );
        } catch (toolError) {
          const msg =
            toolError instanceof Error
              ? toolError.message
              : String(toolError);
          stream.markdown(`\n\n**Tool error:** ${msg}`);

          // Feed the error back so the model can react
          toolResultParts.push(
            new vscode.LanguageModelToolResultPart(toolCall.callId, [
              new vscode.LanguageModelTextPart(`Error: ${msg}`),
            ])
          );
        }
      }

      // Add tool results as a user message and loop back
      messages.push(
        vscode.LanguageModelChatMessage.User(toolResultParts)
      );
    }
  } catch (error) {
    if (error instanceof vscode.LanguageModelError) {
      stream.markdown(`**Model error:** ${error.message}`);
    } else {
      throw error;
    }
  }

  // Return metadata so the followup provider can suggest screenshot analysis
  const metadata: ResearcherResultMetadata = {};
  if (screenshotDirs.length > 0) {
    metadata.screenshotDirs = [...new Set(screenshotDirs)]; // deduplicate
  }
  return { metadata };
}
