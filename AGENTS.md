# AGENTS.md — AI Coding Agent Instructions

This file provides instructions for AI coding agents (GitHub Copilot, Gemini, Claude, etc.) working on this repository.

## Project Overview

This is the **BSides Ballarat 2026 — Security Research Assistant** project by Tim Haintz. It demonstrates Model Context Protocol (MCP) inside VS Code for security research workflows.

See [PRD.md](PRD.md) for the full product requirements.

## Repository Conventions

### Language & Runtime

- **Python 3.10+** for MCP servers and tooling (use type hints everywhere).
- **TypeScript** for the VS Code extension (strict mode).
- **Node.js 18+** for any Node-based MCP servers.

### Code Style

- Python: follow PEP 8; use `ruff` for linting and formatting.
- TypeScript: use the VS Code extension conventions; `eslint` + `prettier`.
- Use descriptive variable and function names — this project is educational.
- Add docstrings / JSDoc comments to all public functions.

### File Organisation

```text
.vscode/          → VS Code workspace config (mcp.json, settings.json, extensions.json)
extension/         → Custom VS Code extension source (TypeScript)
servers/           → Python/Node MCP server code and wrappers
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

### PDF Toolkit Extension

- The project uses [PDF Toolkit](https://marketplace.visualstudio.com/items?itemName=TimHaintz.pdf-toolkit) (`TimHaintz.pdf-toolkit`) — a published VS Code extension by Tim Haintz.
- It opens PDFs natively in VS Code and extracts pages as PNG/JPEG images for AI workflows.
- Key commands: `PDF Toolkit: Screenshot All Pages`, `PDF Toolkit: Screenshot Current Page`, `PDF Toolkit: Screenshot Custom...`
- Extracted images can be added directly to GitHub Copilot Chat via `#file:` references.
- Source code: [github.com/timhaintz/pdf-toolkit](https://github.com/timhaintz/pdf-toolkit)

### Demo Flow

The live demo follows this sequence: **Discover → Acquire → Render → Analyse → Visualise**. When implementing features, consider how they fit into this flow.

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
| `uv` / `pip` | Python package management |
| `npx` | Running Node.js tools |
| `yo code` | Scaffolding VS Code extensions |
| `ruff` | Python linting & formatting |
| `eslint` | TypeScript linting |
| `Semantic Scholar API` | Academic paper search |
