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
   - *System:* Renders the Mermaid diagram interactively in the chat using the Mermaid MCP App.

## 3. Technical Architecture

### 3.1. The "Brain" (Data Source)

- **Component:** `semantic-scholar-mcp`
- **Type:** MCP Server (Python)
- **Function:** Search for papers, retrieve metadata, provide PDF URLs.
- **Configuration:** Requires `SEMANTIC_SCHOLAR_API_KEY`.

### 3.2. The "Eyes" (Rendering)

- **Component:** Custom VS Code Extension (`pdf-viewer`)
- **Function:**
  - Accepts a file path or URL.
  - Converts PDF pages to high-res images (screenshots).
  - Displays images in a custom editor tab so the Multimodal LLM can "see" the diagrams.
- **Key Command:** `pdfviewer.renderToImages` (exposed to the Agent).

### 3.3. The "Visualizer" (Output)

- **Component:** `mermaid-renderer-mcp-app`
- **Type:** MCP Server (Node.js)
- **Function:** Renders Mermaid code into SVG/HTML directly in the chat interface.

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
├── AGENTS.md              # AI coding agent instructions
├── PRD.md                 # This document
└── README.md              # Setup instructions for workshop attendees
```

## 5. Functional Requirements

### 5.1. Workspace Configuration (`.vscode/mcp.json`)

Must define the following servers using dynamic `${workspaceFolder}` paths:

- `semantic-scholar` (via `uv` or `pip`)
- `mermaid-renderer` (via `npx`)
- `local-tools` (Custom Python script for file handling, if needed)

### 5.2. Custom Extension Capabilities

The extension must expose a command `bsides.renderPdf` that:

1. Takes a `uri` or `path` as an argument.
2. Uses a library (e.g., `pdf.js` or system tools) to rasterize the PDF.
3. Opens a webview panel displaying the image.

### 5.3. Mermaid Integration

The system must support the MCP Apps capability (`_meta` resource hints) or fall back to standard Markdown code blocks if the UI is unstable.

### 5.4. VS Code Environment Export

The repo must include all `.vscode/` configuration files so that cloning the repo reproduces the full development environment:

- `.vscode/settings.json` — workspace settings
- `.vscode/extensions.json` — recommended extensions
- `.vscode/mcp.json` — MCP server configuration

## 6. Implementation Plan

### Phase 1: Core Setup

- [x] Initialize Git repo with `.vscode/mcp.json`.
- [ ] Verify `semantic-scholar-mcp` works via the Chat panel.
- [ ] Verify `mermaid-renderer` works via the Chat panel.

### Phase 2: The "Eyes" (Extension)

- [ ] Scaffold a basic VS Code extension (`yo code`).
- [ ] Implement the PDF → Image logic.
- [ ] Register the `renderToImages` command.

### Phase 3: The "Glue" (Automation)

- [ ] Create a "Tool" (Python or TypeScript) that chains the download + render steps.
- [ ] (Optional) Wrap this in a `@researcher` Chat Participant for the "one-click" demo experience.

## 7. Success Criteria

- [ ] User can type **ONE prompt** to find a paper.
- [ ] User can type **ONE prompt** to download and view the PDF.
- [ ] The PDF is visible as an **image** (not text).
- [ ] A **Mermaid diagram** is successfully generated from the context of that paper.
