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
.vscode/          → VS Code workspace config (mcp.json, settings.json, extensions.json, launch.json, tasks.json)
extension/         → @bsides-researcher Chat Participant extension (TypeScript)
  src/             → TypeScript source (extension.ts, participant.ts, tools/)
  out/             → Compiled JavaScript (gitignored)
  package.json     → Extension manifest (chatParticipants, languageModelTools)
servers/           → Python/Node MCP server code and wrappers (if needed)
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
| `ruff` | Python linting & formatting |
| `eslint` | TypeScript linting |
| `Semantic Scholar API` | Academic paper search |
| `semantic-scholar-mcp` | MCP server for Semantic Scholar (run via `uvx`, not `uv run`) |
| `PDF Toolkit` | VS Code extension for PDF viewing and image extraction |
| `@bsides-researcher` extension | Chat Participant + LM tools for download & screenshot automation (in `extension/`) |
