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
   → Multimodal LLM analyses the image → generates a Mermaid diagram → renders it interactively in chat.

## Repository Structure

```text
BSidesBallarat2026/
├── .vscode/
│   ├── mcp.json           # Workspace-local MCP server config
│   ├── extensions.json    # Recommended VS Code extensions
│   └── settings.json      # Workspace settings
├── extension/             # (Phase 2) Custom PDF Viewer Extension
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── servers/               # (Phase 2) Local/custom MCP servers or wrappers
│   └── requirements.txt
├── .env.example           # API key template
├── .gitignore
├── AGENTS.md              # AI coding agent instructions
├── PRD.md                 # Product Requirements Document
└── README.md              # ← You are here
```

## Quick Start

### Prerequisites

- [VS Code](https://code.visualstudio.com/) (stable, latest)
- [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) subscription
- Python 3.10+ and Node.js 18+
- A [Semantic Scholar API key](https://www.semanticscholar.org/product/api) (free)

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/timhaintz/BSidesBallarat2026.git
   cd BSidesBallarat2026
   ```
2. **Open in VS Code** — VS Code will prompt you to install the recommended extensions.
   ```bash
   code .
   ```
3. **Copy the env template** and add your API key:
   ```bash
   cp .env.example .env
   ```
4. **Start the MCP servers** — Open the Chat view and the servers defined in `.vscode/mcp.json` will be available.

## Project Documents

| Document | Purpose |
|---|---|
| [PRD.md](PRD.md) | Full Product Requirements — architecture, phases, success criteria |
| [AGENTS.md](AGENTS.md) | Instructions for AI coding agents working on this repo |

## Contributing

This project is being built live for the BSides Ballarat 2026 presentation. Feel free to watch, fork, or open issues/discussions.

## License

MIT
