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
   - *System:* Downloads PDF to `/tmp`.
   - *System:* Triggers the **Custom PDF Viewer Extension** to convert the first page to an image and display it in the editor.
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

### 3.4. The "Glue" (Control Plane)

- **Component:** `@researcher` Chat Participant — a custom VS Code extension
- **Type:** VS Code Extension (TypeScript, uses `vscode.chat.createChatParticipant()` API)
- **Function:**
  - Registers a `@researcher` Chat Participant in GitHub Copilot Chat.
  - Registers LM tools via `vscode.lm.registerTool()` for paper download and PDF rendering.
  - Chains the full workflow: search → download → render → analyse → visualise.
  - Uses `fetch()` for arXiv PDF downloads (no external MCP server needed).
  - Invokes PDF Toolkit commands via `vscode.commands.executeCommand()` for screenshot extraction.
- **Why this approach?** No separate process, no MCP server overhead — everything runs in-process inside VS Code. The Chat Participant gives users a natural `@researcher find prompt injection papers` experience.

## 4. Repository Structure

The project is a self-contained repository using workspace-local MCP configuration for easy sharing.

```text
BSidesBallarat2026/
├── .vscode/
│   ├── mcp.json           # Workspace-local MCP Server config
│   ├── extensions.json    # Recommended extensions (Python, MCP, Mermaid)
│   └── settings.json      # Workspace settings
├── extension/             # Source code for the Custom PDF Viewer Extension
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── servers/               # Local/Custom MCP Servers or wrappers
│   ├── paper-tools/       # (Optional) Python script for "Download & Trigger" logic
│   └── requirements.txt
├── .env.example           # API Key template
├── .python-version        # Python version pin (managed by uv)
├── pyproject.toml         # Python project config & dependencies
├── uv.lock                # Lockfile for reproducible installs
├── AGENTS.md              # AI coding agent instructions
├── PRD.md                 # This document
└── README.md              # Setup instructions for workshop attendees
```

## 5. Functional Requirements

### 5.1. Workspace Configuration (`.vscode/mcp.json`)

Must define the following servers using dynamic `${workspaceFolder}` paths:

- `semantic-scholar` (via `uv`)
- `local-tools` (Custom Python script for file handling, if needed)

### 5.2. `@researcher` Chat Participant Extension

The extension registers a `@researcher` Chat Participant and LM tools:

1. **Chat Participant** (`@researcher`) — handles natural language requests like "find papers on prompt injection" or "download and render paper 2502.05174".
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

- [ ] Scaffold `@researcher` Chat Participant extension in `extension/` directory.
- [ ] Implement `download_arxiv_paper` LM tool (fetch PDF from arXiv, save to `papers/`).
- [ ] Implement `screenshot_pdf` LM tool (invoke PDF Toolkit via `vscode.commands.executeCommand()`).
- [ ] Register `@researcher` Chat Participant with intent detection and workflow chaining.
- [ ] Test end-to-end: `@researcher find and analyse prompt injection papers`.

## 7. Success Criteria

- [x] User can type **ONE prompt** to find a paper.
  - Demonstrated: "find latest prompt injection papers" → Semantic Scholar MCP returned 15 results.
- [x] User can type **ONE prompt** to download and view the PDF.
  - Demonstrated: "download the 4 highlighted papers" → PDFs saved to `papers/`.
- [x] The PDF is visible as an **image** (not text).
  - Demonstrated: PDF Toolkit `Screenshot All Pages` extracted MELON paper pages as images, attached to Copilot Chat.
- [x] A **Mermaid diagram** is successfully generated from the context of that paper.
  - Demonstrated: 3 Mermaid diagrams generated in `papers/melon-paper-analysis.md` from MELON paper analysis.
