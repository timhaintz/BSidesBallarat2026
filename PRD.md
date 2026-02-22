# Product Requirements Document (PRD): BSides Security Research Assistant

## 1. Executive Summary

**Project Name:** BSides Security Research Stack
**Goal:** Create a "Security Operations Center" inside VS Code for the BSides Ballarat 2026 presentation.
**Core Value:** Demonstrate how Model Context Protocol (MCP) allows a security researcher to discover, view, and visualize academic vulnerabilities without leaving the IDE.
**Target Audience:** Security researchers, penetration testers, and developers attending BSides.
**Presenter:** Tim Haintz
**Conference:** [BSides Ballarat 2026](https://federation.edu.au/icsl/icsl-conferences/bsides-ballarat-2026)
**Status:** Draft — this PRD is a living document that will evolve as the project is built live.

## 2. User Flow (The Demo Script)

This toolchain supports a specific "Hero Flow" to be performed live on stage:

1. **Discovery:** User asks the Agent to find the latest paper on a specific threat (e.g., "Prompt Injection").
   - *System:* Queries Semantic Scholar via MCP → Returns Abstract & PDF URL.
2. **Acquisition & Rendering:** User asks the Agent to download and "show" the paper.
   - *System:* Downloads PDF to `papers/` directory.
   - *System:* Triggers **PDF Toolkit** to extract page images and display them in the editor.
3. **Analysis & Visualization:** User asks the Agent to explain the attack flow visually.
   - *System:* Multimodal LLM analyzes the rendered image (screenshot).
   - *System:* Generates Mermaid code representing the attack architecture.
   - *System:* Saves Mermaid code to a `.md` file and opens it with the Markdown Mermaid preview extension.

## 3. Technical Architecture

### 3.1. The "Brain" (Data Source)

- **Component:** `semantic-scholar-mcp`
- **Type:** MCP Server (Python)
- **Function:** Search for papers, retrieve metadata, provide PDF URLs.
- **Configuration:** Requires `SEMANTIC_SCHOLAR_API_KEY`.

### 3.2. The "Eyes" (Rendering)

- **Component:** [PDF Toolkit](https://marketplace.visualstudio.com/items?itemName=TimHaintz.pdf-toolkit) (`TimHaintz.pdf-toolkit`)
- **Type:** VS Code Extension (published on Marketplace, included in `.vscode/extensions.json`)
- **Function:**
  - Opens PDF files natively in VS Code.
  - Extracts pages as PNG/JPEG images (screenshot) for AI-assisted workflows.
  - Extracts embedded raster images from PDFs.
  - Images can be added directly to GitHub Copilot Chat via `#file:` references.
- **Key Commands:** `PDF Toolkit: Screenshot All Pages`, `PDF Toolkit: Screenshot Current Page`, `PDF Toolkit: Screenshot Custom...`

### 3.3. The "Visualizer" (Output)

- **Component:** `bierner.markdown-mermaid` VS Code extension
- **Type:** VS Code Extension (already in `.vscode/extensions.json`)
- **Function:** Renders Mermaid code blocks in Markdown preview. The Agent generates a `.md` file containing a Mermaid code block, which is previewed natively in VS Code.

### 3.4. The "Stage" (Presentation)

- **Component:** [Marp for VS Code](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode) (`marp-team.marp-vscode`)
- **Type:** VS Code Extension (from Marketplace, included in `.vscode/extensions.json`)
- **Function:** Renders `presentation/slides.md` as a slide deck directly in VS Code. Custom theme (`presentation/theme.css`) provides a dark hacker aesthetic with BSides branding.
- **Key Commands:** `Marp: Open Preview to the Side`, `Marp: Export Slide Deck...`

### 3.5. The "Wow" (Interactive Diagrams)

- **Component:** MCP Apps server (`servers/mcp-slides/`)
- **Type:** MCP Server (TypeScript, stdio transport) using [`@modelcontextprotocol/ext-apps`](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps) SDK
- **Function:**
  - Provides a `show_architecture` tool that renders the interactive "BSides Ballarat Research Assistant — Pipeline" diagram (Discover → Acquire → Render → Analyse → Visualise) directly in the Copilot Chat panel.
  - Uses the MCP Apps extension: tool returns data + declares a `ui://` resource containing self-contained HTML. VS Code fetches the resource and renders it in a sandboxed iframe inline in chat.
  - Clickable stage cards with detail panels, tech stack tags, and animated transitions.
  - Optional `highlightStage` parameter to spotlight a specific pipeline stage during the demo.
  - CSP configuration allows `esm.sh` CDN for the MCP App SDK; dynamic `import()` ensures DOM renders even if CDN is blocked.
- **Configuration:** Defined as `bsidesSlides` in `.vscode/mcp.json` (stdio, `npx tsx`).

### 3.6. The "Glue" (Control Plane)

- **Component:** `@bsides-researcher` Chat Participant — a custom VS Code extension
- **Type:** VS Code Extension (TypeScript, uses `vscode.chat.createChatParticipant()` API)
- **Function:**
  - Registers a `@bsides-researcher` Chat Participant in GitHub Copilot Chat.
  - Registers LM tools via `vscode.lm.registerTool()` for paper download and PDF rendering.
  - Chains the full workflow: search → download → render → analyse → visualise.
  - Uses Node.js `https` module for arXiv PDF downloads (with redirect handling and `User-Agent` header).
  - Invokes PDF Toolkit commands via `vscode.commands.executeCommand()` for screenshot extraction.
  - **Agentic tool-calling loop** feeds tool results back to the LLM so it can chain actions (e.g., use downloaded filenames for screenshots).
  - Declares `extensionDependencies: ["TimHaintz.pdf-toolkit"]` and explicitly activates PDF Toolkit before calling its commands.
- **Why this approach?** No separate process, no MCP server overhead — everything runs in-process inside VS Code. The Chat Participant gives users a natural `@bsides-researcher find prompt injection papers` experience.

## 4. Repository Structure

The project is a self-contained repository using workspace-local MCP configuration for easy sharing.

```text
BSidesBallarat2026/
├── .vscode/
│   ├── mcp.json           # Workspace-local MCP Server config
│   ├── extensions.json    # Recommended extensions (Python, MCP, Mermaid)
│   ├── settings.json      # Workspace settings
│   ├── launch.json        # F5 launch config for Extension Development Host
│   └── tasks.json         # Build tasks (compile, watch)
├── extension/             # @bsides-researcher Chat Participant Extension
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── servers/
│   └── mcp-slides/        # MCP Apps server — interactive HTML diagrams in chat
│       ├── src/
│       └── package.json
├── presentation/          # Marp slide deck and custom theme
│   ├── slides.md
│   └── theme.css
├── papers/                # Downloaded PDFs and analysis Markdown files
├── PDF-Screenshots/       # Page images extracted by PDF Toolkit
├── bsides-researcher.code-workspace  # Workspace file for Extension Dev Host
├── .env.example           # API Key template
├── .python-version        # Python version pin (managed by uv)
├── pyproject.toml         # Python project config & dependencies
├── uv.lock                # Lockfile for reproducible installs
├── .github/agents/        # Custom Agent definition (bsides-researcher.md)
├── AGENTS.md              # AI coding agent instructions
├── PRD.md                 # This document
└── README.md              # Setup instructions for workshop attendees
```

## 5. Functional Requirements

### 5.1. Workspace Configuration (`.vscode/mcp.json`)

Must define the following servers using dynamic `${workspaceFolder}` paths:

- `semantic-scholar` (via `uv`)
- `local-tools` (Custom Python script for file handling, if needed)

### 5.2. `@bsides-researcher` Chat Participant Extension

The extension registers a `@bsides-researcher` Chat Participant and LM tools:

1. **Chat Participant** (`@bsides-researcher`) — handles natural language requests like "find papers on prompt injection" or "download and render paper 2502.05174".
2. **LM Tool: `download_arxiv_paper`** — downloads a PDF from arXiv given an arXiv ID, saves to `papers/` with a kebab-case filename.
3. **LM Tool: `screenshot_pdf`** — invokes PDF Toolkit's `Screenshot All Pages` command via `vscode.commands.executeCommand()` to extract page images.
4. The participant uses the VS Code Language Model API (`vscode.lm.sendChatRequest()`) for AI-powered analysis and Mermaid diagram generation.

### 5.3. Mermaid Integration

Mermaid diagrams are rendered using the `bierner.markdown-mermaid` VS Code extension (included in `.vscode/extensions.json`). The Agent generates a Markdown file with a Mermaid code block, which can be previewed using VS Code's built-in Markdown preview.

### 5.4. VS Code Environment Export

The repo must include all `.vscode/` configuration files so that cloning the repo reproduces the full development environment:

- `.vscode/settings.json` — workspace settings
- `.vscode/extensions.json` — recommended extensions
- `.vscode/mcp.json` — MCP server configuration

## 6. Implementation Plan

### Phase 1: Core Setup

- [x] Initialize Git repo with `.vscode/mcp.json`.
- [x] Verify `semantic-scholar-mcp` works via the Chat panel.
  - Queried "prompt injection" — returned 2,517 results, reviewed top 15.
  - Downloaded 4 highlighted papers as PDFs to `papers/` directory.
- [x] Verify Mermaid preview works via the `bierner.markdown-mermaid` extension.
  - Generated `papers/melon-paper-analysis.md` with 3 Mermaid diagrams (detection pipeline, attack taxonomy, sequence diagram) from the MELON paper.

### Phase 2: The "Eyes" (Extension)

- [x] Publish [PDF Toolkit](https://marketplace.visualstudio.com/items?itemName=TimHaintz.pdf-toolkit) extension to the Marketplace.
- [x] PDF → Image screenshot extraction (all pages, current page, custom).
- [x] Embedded image extraction from PDFs.
- [x] Copilot Chat integration via `#file:` references.

### Phase 3: The "Glue" (Automation)

- [x] Scaffold `@bsides-researcher` Chat Participant extension in `extension/` directory.
- [x] Implement `download_arxiv_paper` LM tool (fetch PDF from arXiv, save to `papers/`).
- [x] Implement `screenshot_pdf` LM tool (invoke PDF Toolkit via `vscode.commands.executeCommand()`).
- [x] Register `@bsides-researcher` Chat Participant with intent detection and workflow chaining.
- [x] Agentic tool-calling loop — tool results fed back to LLM for multi-step workflows.
- [x] Workspace file (`bsides-researcher.code-workspace`) for Extension Development Host.
- [x] Human-in-the-loop — `confirmationMessages` dialog before each PDF screenshot, `ChatFollowupProvider` for post-screenshot analysis suggestions.
- [x] `saveMarkdown` LM tool — saves analysis and Mermaid diagrams to workspace files.
- [x] Dynamic tool discovery — all available LM tools (including MCP) passed to the model.
- [x] BSides Researcher Custom Agent (`.github/agents/bsides-researcher.md`) — same pipeline, runs in main VS Code window without Extension Development Host.
- [x] Test end-to-end: `@bsides-researcher find and analyse prompt injection papers`.
  - Demonstrated: Full pipeline via `/workflow prompt injection` — Semantic Scholar search returned 20 papers, 4 downloaded to `papers/`, screenshots extracted to `PDF-Screenshots/`, Mermaid diagrams generated, analysis saved to `papers/prompt-injection-research-analysis.md` (16.2 KB).
  - Human-in-the-loop confirmation dialogs shown before each PDF screenshot.
  - Followup suggestions offered post-screenshot for selective analysis.

### Phase 4: Presentation & Interactive Diagrams

- [x] Create Marp slide deck (`presentation/slides.md`) with custom dark hacker theme (`presentation/theme.css`).
- [x] Register Marp theme in `.vscode/settings.json` and extension in `.vscode/extensions.json`.
- [x] Scaffold MCP Apps server (`servers/mcp-slides/`) with `show_architecture` tool.
- [x] Self-contained interactive HTML diagram with dark hacker aesthetic, clickable pipeline stages, and MCP App SDK integration.
- [x] Register `bsidesSlides` MCP server in `.vscode/mcp.json`.
- [x] Verify server starts and responds to initialize request.
- [x] End-to-end test: invoke `show_architecture` in Copilot Chat and verify interactive diagram renders inline.
  - Demonstrated: `show_architecture` renders the "BSides Ballarat Research Assistant — Pipeline" diagram inline in Copilot Chat with 5 clickable stage cards, detail panels, tech stack tags, and animated transitions.
  - Fixed Zod v4 schema compatibility issue (MCP SDK v1.26.0 requires Zod schemas, not plain JSON objects).
  - Fixed blank cards caused by static ESM import blocking entire module in sandboxed iframe — switched to dynamic `import()` with graceful fallback.
  - Added CSP `resourceDomains` for `esm.sh` CDN access in the iframe.
  - Added `scrollIntoView` so detail panels are visible in the iframe's limited viewport.

## 7. Success Criteria

- [x] User can type **ONE prompt** to find a paper.
  - Demonstrated: "find latest prompt injection papers" → Semantic Scholar MCP returned 15 results.
- [x] User can type **ONE prompt** to download and view the PDF.
  - Demonstrated: "download the 4 highlighted papers" → PDFs saved to `papers/`.
- [x] The PDF is visible as an **image** (not text).
  - Demonstrated: PDF Toolkit `Screenshot All Pages` extracted MELON paper pages as images, attached to Copilot Chat.
- [x] A **Mermaid diagram** is successfully generated from the context of that paper.
  - Demonstrated: 3 Mermaid diagrams generated in `papers/melon-paper-analysis.md` from MELON paper analysis.
