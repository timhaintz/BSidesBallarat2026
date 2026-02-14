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

- **Option A (Simple):** Use the default VS Code Copilot/Chat Agent with prompt engineering to invoke tools.
- **Option B (Robust):** A Custom Chat Participant (`@researcher`) using the **GitHub Copilot SDK**. This ensures deterministic execution of the PDF download and render commands.

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

### 5.2. Custom Extension Capabilities

The extension must expose a command `bsides.renderPdf` that:

1. Takes a `uri` or `path` as an argument.
2. Uses a library (e.g., `pdf.js` or system tools) to rasterize the PDF.
3. Opens a webview panel displaying the image.

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

- [ ] Create a "Tool" (Python or TypeScript) that chains the download + render steps.
- [ ] (Optional) Wrap this in a `@researcher` Chat Participant for the "one-click" demo experience.

## 7. Success Criteria

- [x] User can type **ONE prompt** to find a paper.
  - Demonstrated: "find latest prompt injection papers" → Semantic Scholar MCP returned 15 results.
- [x] User can type **ONE prompt** to download and view the PDF.
  - Demonstrated: "download the 4 highlighted papers" → PDFs saved to `papers/`.
- [x] The PDF is visible as an **image** (not text).
  - Demonstrated: PDF Toolkit `Screenshot All Pages` extracted MELON paper pages as images, attached to Copilot Chat.
- [x] A **Mermaid diagram** is successfully generated from the context of that paper.
  - Demonstrated: 3 Mermaid diagrams generated in `papers/melon-paper-analysis.md` from MELON paper analysis.
