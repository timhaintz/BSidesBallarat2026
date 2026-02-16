# BSides Ballarat 2026 — Security Research Assistant

**Presenter:** Tim Haintz
**Conference:** [BSides Ballarat 2026](https://federation.edu.au/icsl/icsl-conferences/bsides-ballarat-2026)
**Status:** 🚧 Planning / Work-in-Progress

## What is this?

A **"Security Operations Center" inside VS Code** — built live as a BSides Ballarat presentation. This project demonstrates how [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) allows a security researcher to **discover, view, and visualize academic vulnerabilities** without leaving the IDE.

The entire VS Code environment (settings, extensions, MCP config) is version-controlled in this repo so anyone can clone it and get the same experience.

## The Demo (Hero Flow)

1. **Discovery** — Ask the Agent to find the latest paper on a threat (e.g., "Prompt Injection").
   → Queries Semantic Scholar via MCP → returns abstract & PDF URL.
2. **Acquisition & Rendering** — Ask the Agent to download and "show" the paper.
   → Downloads PDF → Custom Extension renders it as an image in the editor.
3. **Analysis & Visualization** — Ask the Agent to explain the attack flow visually.
   → Multimodal LLM analyses the image → generates a Mermaid diagram → previews it via the Markdown Mermaid extension.

## Repository Structure

```text
BSidesBallarat2026/
├── .vscode/
│   ├── mcp.json           # Workspace-local MCP server config
│   ├── extensions.json    # Recommended VS Code extensions
│   ├── settings.json      # Workspace settings
│   ├── launch.json        # F5 launch config for Extension Development Host
│   └── tasks.json         # Build tasks (compile, watch)
├── extension/             # @bsides-researcher Chat Participant Extension
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── papers/                # Downloaded PDFs and analysis Markdown files
├── PDF-Screenshots/       # Page images extracted by PDF Toolkit
├── bsides-researcher.code-workspace  # Workspace file for Extension Dev Host
├── .env.example           # API key template
├── .gitignore
├── .python-version        # Python version pin (managed by uv)
├── pyproject.toml         # Python project config & dependencies
├── uv.lock                # Lockfile for reproducible installs
├── AGENTS.md              # AI coding agent instructions
├── PRD.md                 # Product Requirements Document
└── README.md              # ← You are here
```

## Quick Start

### Prerequisites

- [VS Code](https://code.visualstudio.com/) (stable, latest)
- [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) subscription
- Python 3.13+ and Node.js 18+
- [`uv`](https://docs.astral.sh/uv/) for Python virtual environments and package management
- A [Semantic Scholar API key](https://www.semanticscholar.org/product/api) (free)

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/timhaintz/BSidesBallarat2026.git
   cd BSidesBallarat2026
   ```
2. **Install Python 3.13+ and create the virtual environment**
   ```bash
   uv python install 3.13
   uv sync --group dev
   ```
3. **Open in VS Code** — VS Code will prompt you to install the recommended extensions.
   ```bash
   code .
   ```
4. **Copy the env template** and add your API key:
   ```bash
   cp .env.example .env
   ```
5. **Start the MCP servers** — Open the Chat view and the servers defined in `.vscode/mcp.json` will be available.

6. **Build and launch the extension**
   ```bash
   cd extension
   npm install
   npm run compile
   ```
   Press **Ctrl+Shift+D** to open the Run and Debug panel, select **"Run @bsides-researcher Extension"**, then press **F5** to launch the Extension Development Host. The `@bsides-researcher` participant will be available in the Copilot Chat panel in the new window.

## Project Documents

| Document | Purpose |
|---|---|
| [PRD.md](PRD.md) | Full Product Requirements — architecture, phases, success criteria |
| [AGENTS.md](AGENTS.md) | Instructions for AI coding agents working on this repo |

## Contributing

This project is being built live for the BSides Ballarat 2026 presentation. Feel free to watch, fork, or open issues/discussions.

## License

MIT
