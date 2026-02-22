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
├── .github/
│   └── agents/
│       └── bsides-researcher.md  # Custom Agent definition (main VS Code window)
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

## Using the Research Assistant

There are **two ways** to use the BSides Researcher — pick whichever suits your workflow:

| Approach | Runs in | Setup required | Best for |
|---|---|---|---|
| **Custom Agent** (recommended) | Main VS Code window | Clone the repo, open in VS Code | Daily use, quick start, sharing with others |
| **Chat Participant Extension** | Extension Development Host (F5) | `npm install`, `npm run compile`, F5 | Polished demo, advanced features (confirmation dialogs, followup buttons) |

Both approaches use the same pipeline: **Discover → Acquire → Render → Analyse → Visualise**.

---

### Option A: Custom Agent (Recommended)

The Custom Agent works immediately in your main VS Code window — no compilation or separate window needed. Anyone who clones this repo gets it automatically.

#### Getting Started

1. Open this repo in VS Code.
2. Open the Chat view (**Ctrl+Alt+I**).
3. Click the **Agent** dropdown at the bottom of the chat panel.
4. Select **BSides Researcher** from the list.
5. Type your research question and press Enter.

#### Example Prompts

```
Find the latest papers on prompt injection defenses
```

```
Search for research on LLM jailbreaking techniques and download the top 3 papers
```

```
Find papers about adversarial attacks on multimodal models, download them,
screenshot the PDFs, and save an analysis with Mermaid diagrams
```

```
Get the paper with arXiv ID 2502.05174 and analyse its defense architecture
```

```
Compare the approaches in the papers I've already downloaded in the papers/ directory
```

The Custom Agent will ask for your confirmation before downloading papers and rendering screenshots (human-in-the-loop), then walk you through each step of the pipeline.

---

### Option B: Chat Participant Extension (`@bsides-researcher`)

The Chat Participant extension provides a more polished experience with slash commands, confirmation dialogs, and clickable followup suggestions. It requires building the extension and running it in the Extension Development Host.

#### Getting Started

1. Build the extension:

   ```bash
   cd extension
   npm install
   npm run compile
   ```

2. Press **Ctrl+Shift+D** → select **"Run @bsides-researcher Extension"** → press **F5**.
3. In the new Extension Development Host window, open the Chat view (**Ctrl+Alt+I**).
4. Type `@bsides-researcher` followed by your prompt, or use a slash command.

#### Slash Commands

| Command | Description | Example |
|---|---|---|
| `/find` | Search for papers on a topic | `@bsides-researcher /find prompt injection defenses` |
| `/download` | Download a paper by arXiv ID | `@bsides-researcher /download 2502.05174 melon-provable-defense` |
| `/render` | Extract page screenshots from a PDF | `@bsides-researcher /render papers/melon-provable-defense-prompt-injection.pdf` |
| `/workflow` | Run the full pipeline end-to-end | `@bsides-researcher /workflow find and analyse papers on prompt injection` |

#### Example Prompts

**Discover papers:**

```
@bsides-researcher /find LLM supply chain attacks
```

**Download a specific paper:**

```
@bsides-researcher /download 2502.05174 melon-provable-defense
```

**Render a downloaded PDF as screenshots:**

```
@bsides-researcher /render papers/melon-provable-defense-prompt-injection.pdf
```

**Run the full pipeline (search → download → screenshot → analyse → save):**

```
@bsides-researcher /workflow find and analyse papers on prompt injection defenses
```

**General questions (no slash command):**

```
@bsides-researcher What are the main categories of prompt injection attacks?
```

#### Extension-Only Features

- **Confirmation dialogs** — before each PDF is screenshotted, a "Continue" / "Cancel" dialog appears so you can approve each paper individually.
- **Followup suggestions** — after screenshots are extracted, clickable buttons appear (e.g., "Analyse melon-provable-defense screenshots") so you can choose which papers to analyse.
- **Automatic tool chaining** — the agentic loop feeds tool results back into the model so it can use output from one step (e.g., a downloaded filename) as input to the next step (e.g., screenshot that file).

---

### Analysing Screenshots

After rendering a PDF, its page images are saved to `PDF-Screenshots/<paper-name>/`. To analyse them:

1. In the Chat view, type `#file:` and select the screenshot images (or the entire folder) from `PDF-Screenshots/`.
2. Ask the agent to analyse the attached images:

   ```
   Analyse these paper screenshots and create a security research summary with Mermaid diagrams
   ```

3. The agent reads the images, extracts key findings, and generates Mermaid diagrams for attack/defense flows.
4. The analysis is saved as a Markdown file in `papers/` — open Markdown preview (**Ctrl+Shift+V**) to see the Mermaid diagrams rendered.

### Where Things End Up

| Output | Location |
|---|---|
| Downloaded PDFs | `papers/<kebab-case-name>.pdf` |
| Page screenshots | `PDF-Screenshots/<paper-name>/page-1.png`, `page-2.png`, … |
| Analysis Markdown | `papers/<topic>-research-analysis.md` |
| Mermaid diagrams | Embedded in the analysis Markdown files |

---

## Project Documents

| Document | Purpose |
|---|---|
| [PRD.md](PRD.md) | Full Product Requirements — architecture, phases, success criteria |
| [AGENTS.md](AGENTS.md) | Instructions for AI coding agents working on this repo |

## Contributing

This project is being built live for the BSides Ballarat 2026 presentation. Feel free to watch, fork, or open issues/discussions.

## License

MIT
