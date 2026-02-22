# AGENTS.md — AI Coding Agent Instructions

This file provides instructions for AI coding agents (GitHub Copilot, Gemini, Claude, etc.) working on this repository.

## Project Overview

This is the **BSides Ballarat 2026 — Security Research Assistant** project by Tim Haintz. It demonstrates Model Context Protocol (MCP) inside VS Code for security research workflows.

See [PRD.md](PRD.md) for the full product requirements.

## Repository Conventions

### Language & Runtime

- **Python 3.13+** for MCP servers and tooling (use type hints everywhere).
- **TypeScript** for the VS Code extension (strict mode).
- **Node.js 18+** for any Node-based MCP servers.
- **`uv`** is the preferred tool for Python virtual environments and package management.

### Python Environment (uv)

- **`uv`** manages the virtual environment (`.venv/`), dependencies, and Python version.
- The project is defined in `pyproject.toml` — add dependencies with `uv add <package>`.
- Dev dependencies (ruff, pytest) are in the `[dependency-groups] dev` group.
- Run any Python command through `uv run` (e.g., `uv run python script.py`, `uv run ruff check`).
- The `.python-version` file pins the Python version; `uv sync` will auto-install it.
- **Do not** use `pip install`, `python -m venv`, or manual `.venv` activation — use `uv` for everything.

### Code Style

- Python: follow PEP 8; use `ruff` for linting and formatting (`uv run ruff check .`, `uv run ruff format .`).
- TypeScript: use the VS Code extension conventions; `eslint` + `prettier`.
- Use descriptive variable and function names — this project is educational.
- Add docstrings / JSDoc comments to all public functions.

### File Organisation

```text
.github/agents/    → Custom Agent definition (bsides-researcher.md) — works in main VS Code window
.vscode/          → VS Code workspace config (mcp.json, settings.json, extensions.json, launch.json, tasks.json)
extension/         → @bsides-researcher Chat Participant extension (TypeScript)
  src/             → TypeScript source (extension.ts, participant.ts, tools/)
  out/             → Compiled JavaScript (gitignored)
  package.json     → Extension manifest (chatParticipants, languageModelTools)
servers/           → Node MCP server code
  mcp-slides/      → MCP Apps server — interactive HTML diagrams inline in Copilot Chat
    src/           → TypeScript source (index.ts) + UI HTML (ui/architecture.html)
    package.json   → Dependencies (@modelcontextprotocol/sdk, @modelcontextprotocol/ext-apps)
presentation/      → Marp slide deck and custom theme for the BSides Ballarat 2026 talk
  slides.md        → Marp Markdown slides (12 slides, 20-minute talk)
  theme.css        → Custom dark hacker theme (BSides aesthetic)
papers/            → Downloaded research PDFs and analysis Markdown files
PDF-Screenshots/   → PNG/JPEG images extracted from PDFs via PDF Toolkit
```

### Git Conventions

- Commit messages: use [Conventional Commits](https://www.conventionalcommits.org/) format.
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation only changes
  - `chore:` for maintenance tasks
  - `refactor:` for code restructuring
- Branch naming: `feature/<short-description>`, `fix/<short-description>`, `docs/<short-description>`.
- PRs should reference the relevant GitHub issue.

### VS Code Workspace Configuration

This repo ships its VS Code environment so anyone who clones it gets the same setup:

- **`.vscode/settings.json`** — workspace settings (editor, Python, etc.)
- **`.vscode/extensions.json`** — recommended extensions list
- **`.vscode/mcp.json`** — MCP server definitions using `${workspaceFolder}` paths

When modifying workspace config, always use workspace-relative paths (`${workspaceFolder}`) so the repo remains portable.

## Key Architecture Decisions

### MCP Servers

- All MCP servers are configured in `.vscode/mcp.json` using `stdio` transport.
- API keys are referenced via `${input:...}` variables — never hardcode secrets.
- The `.env.example` file documents required environment variables.

### Semantic Scholar MCP Server

- **Package:** `semantic-scholar-mcp` by Ante Kapetanovic (akapet00) — community, MIT license.
- **Security:** Audited as LOW RISK — clean code, proper SSL, Pydantic models, no shell exec, 3 runtime deps (FastMCP, httpx, pydantic).
- **Runs via `uvx`**, not `uv run`. This is critical:
  - `uv run` = runs commands in the **project's** virtual environment (`.venv/`).
  - `uvx` = runs external tools in **isolated** ephemeral environments (like `npx` for Node).
  - The MCP server is an external tool, so `.vscode/mcp.json` uses `"command": "uvx"` with `"args": ["semantic-scholar-mcp"]`.
- **OneDrive / cloud drive compatibility:** `UV_LINK_MODE=copy` is set in `.vscode/mcp.json` `env` because OneDrive does not support hardlinks. Without this, `uvx` will fail with `os error 396`. If the workspace is on a normal local drive, this setting is harmless.
- **Known limitation:** The `fields` parameter in search tools (e.g., `search_papers`) may not return all requested fields (often returns only titles). Use `get_paper` with a known `paperId` for full metadata, or construct arXiv PDF URLs directly (e.g., `https://arxiv.org/pdf/XXXX.XXXXX`).
- **Requires:** `SEMANTIC_SCHOLAR_API_KEY` (free tier available at [semanticscholar.org/product/api](https://www.semanticscholar.org/product/api)).

### PDF Toolkit Extension

- The project uses [PDF Toolkit](https://marketplace.visualstudio.com/items?itemName=TimHaintz.pdf-toolkit) (`TimHaintz.pdf-toolkit`) — a published VS Code extension by Tim Haintz.
- It opens PDFs natively in VS Code and extracts pages as PNG/JPEG images for AI workflows.
- Key commands: `PDF Toolkit: Screenshot All Pages`, `PDF Toolkit: Screenshot Current Page`, `PDF Toolkit: Screenshot Custom...`
- Extracted images can be added directly to GitHub Copilot Chat via `#file:` references.
- Source code: [github.com/timhaintz/pdf-toolkit](https://github.com/timhaintz/pdf-toolkit)

### MCP Apps Server (`servers/mcp-slides/`)

The MCP Apps server provides **interactive HTML diagrams** that render inline in the Copilot Chat panel. This is used during the live demo as a "wow moment" — the architecture pipeline diagram appears directly in chat, not in a separate window.

#### What are MCP Apps?

- **MCP Apps** extend the [Model Context Protocol](https://modelcontextprotocol.io/) by letting tools declare UI resources.
- A tool returns structured data via the normal MCP `content` array **plus** declares a `ui://` resource containing its HTML interface.
- The host (VS Code Copilot Chat, Claude Desktop, etc.) fetches the resource and renders it in a **sandboxed iframe** inline in the conversation.
- Bidirectional communication: the host passes tool data to the UI via notifications, and the UI can call other tools through the host.
- **Specification:** [MCP Apps spec (2026-01-26)](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx) — an extension to the core MCP spec.
- **SDK:** [`@modelcontextprotocol/ext-apps`](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps) (v1.1.0) — Apache 2.0 license.
- **API docs:** [modelcontextprotocol.github.io/ext-apps/api/](https://modelcontextprotocol.github.io/ext-apps/api/)
- **Quickstart:** [Quickstart Guide](https://modelcontextprotocol.github.io/ext-apps/api/documents/Quickstart.html)
- **Supported clients:** Claude, Claude Desktop, VS Code Insiders, Goose, Postman, MCPJam.

#### Architecture

- **Transport:** stdio (launched by VS Code from `.vscode/mcp.json`).
- **Server:** Uses `McpServer` from `@modelcontextprotocol/sdk` + `registerAppTool` / `registerAppResource` from `@modelcontextprotocol/ext-apps/server`.
- **Tool:** `show_architecture` — displays the "BSides Ballarat Research Assistant — Pipeline" (Discover → Acquire → Render → Analyse → Visualise) as an interactive, clickable diagram.
  - Optional `highlightStage` parameter to spotlight a specific stage.
  - `_meta.ui.resourceUri` links to `ui://bsides-slides/architecture.html`.
- **UI Resource:** Self-contained HTML (`src/ui/architecture.html`) with:
  - Dark hacker aesthetic matching the Marp presentation theme.
  - Clickable stage cards with detail panels, tech stack tags, and animated transitions.
  - MCP App SDK integration via dynamic `import()` from `https://esm.sh/@modelcontextprotocol/ext-apps@1.1.0` — receives tool result data and highlights the requested stage.
  - Dynamic import ensures DOM renders even if the CDN fetch fails (CSP blocked, offline, etc.).
  - `scrollIntoView` on detail panels so they’re visible in the iframe’s limited viewport.
  - Graceful fallback: works as standalone HTML outside an MCP host.
- **Runs via `npx tsx`** — no build step needed. `tsx` transpiles TypeScript on-the-fly.

#### MCP Apps Core Pattern: Tool + UI Resource

```typescript
// 1. Register a tool with UI metadata (inputSchema must use Zod, not plain JSON)
import { z } from "zod";
registerAppTool(server, "tool-name", {
  title: "Tool Title",
  description: "What the tool does",
  inputSchema: { myParam: z.string().optional().describe("Description") },
  _meta: { ui: {
    resourceUri: "ui://server-name/page.html",
    csp: { resourceDomains: ["https://esm.sh"] },  // allow CDN in iframe
  } },
}, async (args) => {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
});

// 2. Register the UI resource that the host will fetch and render
registerAppResource(server, resourceUri, resourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    const html = await fs.readFile(path.join(import.meta.dirname, "ui", "page.html"), "utf-8");
    return { contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }] };
  },
);
```

#### SDK Modules

| Module | Purpose |
|---|---|
| `@modelcontextprotocol/ext-apps` | Build interactive Views (`App` class, `PostMessageTransport`) — used in the HTML UI |
| `@modelcontextprotocol/ext-apps/server` | Register tools + resources on an MCP server (`registerAppTool`, `registerAppResource`, `RESOURCE_MIME_TYPE`) |
| `@modelcontextprotocol/ext-apps/react` | React hooks for Views (`useApp`, `useHostStyles`, etc.) — not used in this project |
| `@modelcontextprotocol/ext-apps/app-bridge` | Embed and communicate with Views in a chat client host — not used in this project |

#### Key Design Decisions

- **Self-contained HTML** — the architecture diagram is a single HTML file with inline CSS and JS. No build step, no bundler, no framework. This keeps the demo simple and avoids Vite/webpack complexity.
- **Dynamic `import()` from CDN** — the HTML uses `await import("https://esm.sh/@modelcontextprotocol/ext-apps@1.1.0")` (dynamic, not static) inside a try/catch. This ensures all DOM-building code runs even if the CDN fetch is blocked by the iframe’s CSP. A static `import` at the top of a `<script type="module">` would abort the entire module on failure.
- **CSP `resourceDomains`** — the tool registration includes `csp: { resourceDomains: ["https://esm.sh"] }` so the sandboxed iframe allows fetching the SDK from the CDN.
- **Zod schemas required** — MCP SDK v1.26.0 with Zod 4 requires actual Zod schemas for `inputSchema`, not plain JSON schema objects. The SDK’s `zod-compat.js` checks for `_zod` markers; plain objects fall through to a v3 code path that calls `.safeParseAsync()` on the raw object (which fails). Always use `z.string()`, `z.enum([...])`, etc.
- **No Vite** — the quickstart guide recommends Vite + `vite-plugin-singlefile` for production apps, but our self-contained HTML approach is simpler for a single interactive diagram.
- **`npx tsx` instead of compiled JS** — avoids a build step. For production, you'd compile with `tsc` and run with `node dist/index.js`.

### Presentation (Marp)

The project includes a [Marp](https://marp.app/) slide deck for the BSides Ballarat 2026 talk ("Fun with Agentic AI", 20 minutes).

- **Slides:** `presentation/slides.md` — 12 Marp Markdown slides.
- **Theme:** `presentation/theme.css` — custom dark hacker aesthetic with BSides branding (dark bg `#0a0e17`, accent blue `#3b82f6`, cyan `#06b6d4`, green `#10b981`).
- **VS Code extension:** `marp-team.marp-vscode` (recommended in `.vscode/extensions.json`).
- **Theme registration:** `.vscode/settings.json` includes `"markdown.marp.themes": ["./presentation/theme.css"]`.
- **Custom CSS classes:** `.title`, `.section`, `.demo`, `.about`, `.pipeline`, `.columns` — applied via Marp's `<!-- _class: classname -->` directive.
- **Export:** Use the Marp extension's export command or `npx @marp-team/marp-cli presentation/slides.md --theme presentation/theme.css --html --allow-local-files`.

### @bsides-researcher Chat Participant Extension

The `@bsides-researcher` Chat Participant is a custom VS Code extension (in `extension/`) that provides the "glue" for the demo workflow. It uses **VS Code extension APIs only** — no external MCP server process needed.

#### Architecture

- **Chat Participant** (`@bsides-researcher`) — registered via `vscode.chat.createChatParticipant()`. Handles natural language requests in Copilot Chat.
- **LM Tools** — registered via `vscode.lm.registerTool()`. Available to any LLM in VS Code:
  - `bsides-researcher_downloadArxivPaper` (ref: `#downloadArxivPaper`) — downloads PDFs from arXiv using Node.js `https` module.
  - `bsides-researcher_screenshotPdf` (ref: `#screenshotPdf`) — invokes PDF Toolkit's extract command via `vscode.commands.executeCommand('pdfToolkit.extractAllPages')`. Explicitly activates PDF Toolkit before calling its commands.
  - `bsides-researcher_saveMarkdown` (ref: `#saveMarkdown`) — saves Markdown content (analysis, Mermaid diagrams) to a file in the workspace and opens it in the editor.
- **Dynamic tool discovery** — `sendToModel()` passes ALL available LM tools (`vscode.lm.tools`) to the model, including MCP tools like Semantic Scholar. This means the model can directly call `mcp_semanticschol_search_papers` etc. instead of just suggesting the user run them.
- **Agentic tool-calling loop** — `sendToModel()` implements a multi-turn loop (max 10 rounds) where tool call results are fed back into the conversation. This lets the model use output from one tool (e.g., downloaded filename) as input to the next tool (e.g., screenshot that file). Without this, the model hallucinates filenames.
- **Multimodal `#file:` reference handling** — `sendToModel()` processes `request.references` (user-attached `#file:` references). Image files (PNG, JPEG, etc.) are read as binary and sent to the model via `LanguageModelDataPart.image()`. Text files are inlined as `LanguageModelTextPart`. This enables the **Analyse** step: users attach extracted PDF screenshots and the model can actually see them.
- **Slash Commands:**
  - `/find <topic>` — search guidance for a security topic
  - `/download <arxivId> [filename]` — download a paper from arXiv
  - `/render <path>` — extract page screenshots from a PDF
  - `/workflow <description>` — full pipeline walkthrough

#### Developing the Extension

```bash
cd extension
npm install
npm run compile    # or: npm run watch
```

Press **Ctrl+Shift+D** to open the Run and Debug panel, select **"Run @bsides-researcher Extension"**, then press **F5** to launch the Extension Development Host. The launch config passes `bsides-researcher.code-workspace` so the dev host opens the full workspace (with `papers/`, MCP servers, etc.).

**Important:** The `@bsides-researcher` participant only appears in the Extension Development Host window, not in the main window. This is normal for extension development.

#### Key Design Decisions

- **No separate MCP server** — tools run in-process via `vscode.lm.registerTool()`, not as a stdio MCP server. This eliminates process management complexity.
- **No `yo code` / Yeoman** — the extension was scaffolded manually (just `package.json`, `tsconfig.json`, and TypeScript source). No third-party scaffolding tools needed.
- **PDF downloads use Node.js `https`** — with redirect handling and a `User-Agent` header (arXiv requires it). No external HTTP libraries.
- **PDF Toolkit integration** — screenshots are triggered via `vscode.commands.executeCommand('pdfToolkit.extractAllPages')`. The actual command ID is `pdfToolkit.extractAllPages` (camelCase prefix, not kebab-case). The extension declares `extensionDependencies: ["TimHaintz.pdf-toolkit"]` and explicitly activates PDF Toolkit before calling its commands.
- **GitHub Copilot Chat** — the old `GitHub.copilot` extension is deprecated. Use `GitHub.copilot-chat` (recommended in `.vscode/extensions.json`).
- **Model selection** — `selectChatModels()` uses `{ vendor: "copilot" }` without hardcoding a model family, so it works with any available Copilot model.
- **Workspace file** — `bsides-researcher.code-workspace` is included so the F5 launch config can open the Extension Development Host with the full workspace.
- **Requires VS Code 1.99+** — for `vscode.lm.registerTool()` API support.
- **Human-in-the-loop confirmation** — the `screenshotPdf` tool uses `prepareInvocation()` to return `confirmationMessages`, which displays a "Continue" / "Cancel" dialog in Copilot Chat before each PDF is rendered. This gives the user control over which papers get screenshotted, especially useful in `/workflow` runs that process multiple papers.
- **Screenshot followup suggestions** — `extension.ts` registers a `ChatFollowupProvider` on the researcher participant. When `sendToModel()` detects that screenshot directories were produced (by inspecting `bsides-researcher_screenshotPdf` tool results), it returns them as `ChatResult.metadata.screenshotDirs`. The followup provider then generates clickable suggestions like "Analyse {paperName} screenshots" for each directory, plus an "Analyse all" option when multiple papers were screenshotted. This lets the user choose which screenshots to feed into the analysis step.
- **Screenshot polling** — after triggering `pdfToolkit.extractAllPages`, the tool polls for output files (up to 15 seconds, checking every 2 seconds) instead of using a fixed delay. This handles large PDFs that take longer to render.

### BSides Researcher Custom Agent (`.github/agents/bsides-researcher.md`)

The **BSides Researcher** Custom Agent provides the same research pipeline as the `@bsides-researcher` Chat Participant extension, but runs directly in the main VS Code window — no Extension Development Host needed.

#### How It Works

- Defined as a `.md` file in `.github/agents/` — VS Code auto-detects it and shows it in the Agent picker dropdown.
- Uses the PEIL (Prompt Engineering Instructional Language) methodology for structured prompt design (see [timhaintz/PromptEngineering](https://github.com/timhaintz/PromptEngineering/tree/main/skills/peil)).
- Hybrid prompt structure per [arXiv:2503.06926](https://arxiv.org/abs/2503.06926): opening statement (role + context) → bullet points (specific rules) → step-by-step pipeline.
- Includes `semanticScholar/*` in the tools list so all Semantic Scholar MCP tools are available.
- Downloads papers via `Invoke-WebRequest` in the terminal (same proven process as the extension).
- Human-in-the-loop: the agent instructions tell it to ask for confirmation before downloading or rendering papers.

#### Custom Agent vs. Chat Participant Extension

| Feature | Custom Agent | Chat Participant Extension |
|---|---|---|
| **Runs in** | Main VS Code window | Extension Development Host (F5) |
| **Setup** | Clone repo, open in VS Code | `npm install`, `npm run compile`, F5 |
| **Semantic Scholar** | Via MCP tools | Via MCP tools (dynamic discovery) |
| **PDF downloads** | Terminal `Invoke-WebRequest` | Node.js `https` module (LM tool) |
| **PDF screenshots** | Terminal / VS Code commands | `pdfToolkit.extractAllPages` (LM tool) |
| **Confirmation UI** | Text-based (agent asks) | `confirmationMessages` dialog |
| **Followup suggestions** | Text-based (agent suggests) | `ChatFollowupProvider` buttons |
| **Slash commands** | Natural language only | `/find`, `/download`, `/render`, `/workflow` |
| **Portable** | Anyone who clones the repo | Requires extension compilation |

Both approaches coexist — the custom agent is for daily use, the extension is for polished demos.

### Demo Flow

The live demo follows this sequence: **Discover → Acquire → Render → Analyse → Visualise**. When implementing features, consider how they fit into this flow.

### Research Workflow (Proven Pattern)

This workflow has been validated end-to-end:

1. **Discover** — Query Semantic Scholar MCP for papers (e.g., "prompt injection").
2. **Acquire** — Download PDFs from arXiv to `papers/` directory (see below).
3. **Render** — Open PDFs in VS Code with PDF Toolkit; use `Screenshot All Pages` to extract page images to `PDF-Screenshots/`.
4. **Analyse** — Attach extracted images to Copilot Chat via `#file:` references for multimodal analysis.
5. **Visualise** — Generate Mermaid diagrams in a Markdown analysis file (e.g., `papers/<name>-paper-analysis.md`); preview with `bierner.markdown-mermaid` extension.

### Downloading Papers from arXiv

The Semantic Scholar MCP server does **not** download raw PDFs. Its `get_paper_fulltext` tool converts PDFs to Markdown, which is not what we want — we need the actual PDF for PDF Toolkit.

**Proven download process:**

1. Find the paper's arXiv ID from Semantic Scholar results (e.g., `2502.05174`).
2. Construct the direct PDF URL: `https://arxiv.org/pdf/<ARXIV_ID>` (e.g., `https://arxiv.org/pdf/2502.05174`).
3. Download using PowerShell:

   ```powershell
   Invoke-WebRequest -Uri "https://arxiv.org/pdf/2502.05174" -OutFile "papers/melon-provable-defense-prompt-injection.pdf" -UserAgent "Mozilla/5.0"
   ```

4. Use kebab-case descriptive filenames (e.g., `adaptive-attacks-indirect-prompt-injection.pdf`).

**Notes:**

- The `-UserAgent` parameter is needed — arXiv may reject requests without it.
- Not all papers are on arXiv. For non-arXiv papers, check if the `externalIds` from `get_paper` contain a DOI or other identifier to find a direct PDF link from the publisher.
- **`openAccessPdf` is unreliable** — tested against the Semantic Scholar API (both direct and via MCP) and it returns empty URLs even for well-known open-access papers (e.g., "Attention is All You Need"). Do not depend on this field for downloading PDFs.
- Do **not** use `get_paper_fulltext` — it converts to Markdown and bypasses PDF Toolkit and won't have access to the images in the PDF.

### Papers Directory Convention

- Downloaded PDFs go in `papers/` with kebab-case descriptive names (e.g., `melon-provable-defense-prompt-injection.pdf`).
- Per-paper analysis Markdown files go alongside the PDFs (e.g., `papers/melon-paper-analysis.md`).
- The `papers/` directory is gitignored (binary PDFs should not be committed). Analysis `.md` files can be committed selectively.

## Working on This Project

### Before Making Changes

1. Read [PRD.md](PRD.md) to understand the project goals and architecture.
2. Check existing GitHub issues for context on what's being worked on.
3. Ensure changes maintain the "clone and go" experience — everything should work after `git clone` + opening in VS Code.

### Testing

- Test MCP servers by starting them from the Chat panel and invoking their tools.
- Test the extension by pressing `F5` to launch the Extension Development Host.
- Document any manual test steps in the relevant PR.

### Security Considerations

- **Never commit API keys or secrets.** Use `.env` files (gitignored) and `${input:...}` in `mcp.json`.
- Review any downloaded PDFs or external data for safety before processing.
- This is a security research tool — treat all inputs as potentially untrusted.

## Dependencies & Tools

| Tool | Purpose |
|---|---|
| `uv` | Python virtual environments, package management, and project commands (preferred) |
| `uvx` | Running external Python tools in isolated environments (like `npx` for Python) |
| `npx` | Running Node.js tools |
| `tsx` | TypeScript execution without compilation (used by MCP Apps server) |
| `ruff` | Python linting & formatting |
| `eslint` | TypeScript linting |
| `Semantic Scholar API` | Academic paper search |
| `semantic-scholar-mcp` | MCP server for Semantic Scholar (run via `uvx`, not `uv run`) |
| `@modelcontextprotocol/ext-apps` | MCP Apps SDK — interactive UI in chat (used by `servers/mcp-slides/`) |
| `@modelcontextprotocol/sdk` | MCP TypeScript SDK — server + transport (used by `servers/mcp-slides/`) |
| `PDF Toolkit` | VS Code extension for PDF viewing and image extraction |
| `Marp for VS Code` | Slide deck presentation from Markdown (`marp-team.marp-vscode`) |
| `@bsides-researcher` extension | Chat Participant + LM tools for download & screenshot automation (in `extension/`) |
