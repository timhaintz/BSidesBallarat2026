---
marp: true
theme: bsides-ballarat
paginate: true
header: '![w:80](https://asterion.federation.edu.au/uploads/logos/1771324993882_goukpfedzci.png)'
footer: 'BSides Ballarat 2026 — Tim Haintz'
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# Fun with Agentic AI

## A "Security Research Assistant" Inside VS Code

### Tim Haintz — BRAIN March 2026

![bg right:35% w:300](https://asterion.federation.edu.au/uploads/logos/1771324993882_goukpfedzci.png)

---

<!-- _class: about -->

# About Me

**[Tim Haintz](https://www.linkedin.com/in/tim-haintz/)** — Ballarat local 🏡

- Senior Product Manager — **Agentic AI, Microsoft Security**
- Masters in Computing by Research — **Federation University / ICSL**
  - Research: [*Prompt Engineering — The Way to Talk to AI*](https://www.timhaintz.com.au/PromptEngineering/)
- Ballarat High School → University of Ballarat → Federation University
- 13 years as Systems Engineer at **Ambulance Victoria** (Ballarat)
- Creator of [**PDF Toolkit**](https://marketplace.visualstudio.com/items?itemName=TimHaintz.pdf-toolkit) — VS Code extension
- GitHub: [timhaintz](https://github.com/timhaintz)

![bg right:30%](https://asterion.federation.edu.au/uploads/speakers/1771325015516_mpk7z62xv5.jpg)

---

# The Talk in One Sentence

> I've built a **Security Research Assistant** and will demonstrate it live using:

- **Model Context Protocol (MCP)** — the open standard for AI-tool integration
- **GitHub Copilot** — the AI brain
- **Custom VS Code extensions** — the eyes and hands
- **Agentic AI** — let the AI chain tools together autonomously

This project is available at:
🔗 [github.com/timhaintz/BSidesBallarat2026](https://github.com/timhaintz/BSidesBallarat2026)

---

# The Problem

Security researchers constantly **context-switch** between:

| Task | Tool |
|---|---|
| Search for papers | Google Scholar / Semantic Scholar |
| Read PDFs | Adobe Acrobat / browser |
| Take notes | Notion / OneNote / Markdown editor |
| Draw diagrams | draw.io / Mermaid Live Editor |
| Write code | VS Code / terminal |

**5+ apps, 10+ tabs, lost context, broken flow.**

What if it was all available inside **[VS Code](https://code.visualstudio.com/)** with the power of **[GitHub Copilot](https://code.visualstudio.com/docs/copilot/overview)**?

---

# What is MCP?

**Model Context Protocol** — an open standard by Anthropic (now Linux Foundation)

Think of it as a **USB-C port for AI models**:

- One protocol, many tools
- Servers expose capabilities (search, data, APIs)
- Clients (VS Code, Claude, etc.) consume them
- Models can call tools dynamically
- Transports: **stdio** | **Streamable HTTP**

> **VS Code (Copilot)** ◄─ MCP (stdio) ─► **Semantic Scholar MCP Server**

> Today: **VS Code + GitHub Copilot + Semantic Scholar MCP**

---

# The Pipeline

## Discover → Acquire → Render → Analyse → Visualise

| Step | What happens | Tool |
|---|---|---|
| **Discover** | Search academic papers | Semantic Scholar MCP |
| **Acquire** | Download PDFs from arXiv | Agent (terminal / Node.js) |
| **Render** | Extract PDF pages as images | [PDF Toolkit extension](https://marketplace.visualstudio.com/items?itemName=TimHaintz.pdf-toolkit) |
| **Analyse** | Multimodal AI reads the pages | GitHub Copilot (GPT-5.3-Codex/Claude) |
| **Visualise** | Generate Mermaid diagrams | Markdown + Mermaid preview |

Each step feeds into the next — **the AI chains them autonomously**.

---

# Two Ways to Use It

| | Custom Agent | Chat Participant Extension |
|---|---|---|
| **Runs in** | Main VS Code window | Extension Dev Host (F5) |
| **Setup** | Clone repo, open VS Code | `npm install`, compile, F5 |
| **How** | Select from Agent picker | Type `@bsides-researcher` |
| **Commands** | Natural language | `/find`, `/download`, `/render`, `/workflow` |
| **Best for** | Daily use, portability | Polished demo, confirmation dialogs |

### Custom Agents = `.github/agents/*.md`

A Markdown file in your repo that becomes an AI agent. No code needed!

---

<!-- _class: demo -->

# 🔴 Live Demo

## Let's find and analyse some papers

---

<!-- _class: section -->

# What Just Happened?

## Let's recap the architecture

---

# Architecture Recap

<!-- _class: pipeline -->

| Component | Role | Connects to |
|---|---|---|
| **Copilot Chat** | AI brain & conversation | BSides Researcher Agent |
| **BSides Researcher Agent** | Orchestrates the pipeline | All tools below |
| **Semantic Scholar MCP** | Search & metadata | Semantic Scholar API |
| **Agent (terminal)** | Download PDFs | arXiv |
| **PDF Toolkit** | Extract pages as images | PNG Screenshots |
| **PNG Screenshots** | `#file:` reference in chat | Copilot (multimodal analysis) |
| **Mermaid Preview** | Visualise analysis | Markdown diagrams |

**One IDE. One conversation. Full research pipeline.**

---

# Key Takeaways

1. **MCP is a game-changer** — connect any data source to any AI model
2. **Custom Agents are dead simple** — a `.md` file in your repo
3. **VS Code is the platform** — extensions + MCP + Copilot = infinite possibilities
4. **Human-in-the-loop matters** — the AI asks before acting
5. **Everything is sharable** — `git clone` and you have the same setup

---

# Try It Yourself

## Clone and go

```bash
git clone https://github.com/timhaintz/BSidesBallarat2026.git
code BSidesBallarat2026
```

**What you need:**

- VS Code (latest)
- GitHub Copilot subscription
- Semantic Scholar API key (free)

**All config is in the repo** — `.vscode/mcp.json`, extensions, agents.

---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# Thank You

## Questions?

### Tim Haintz

GitHub: [timhaintz](https://github.com/timhaintz) · Repo: [BSidesBallarat2026](https://github.com/timhaintz/BSidesBallarat2026)
LinkedIn: [tim-haintz](https://www.linkedin.com/in/tim-haintz/)

![w:150](https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://www.linkedin.com/in/tim-haintz/)

![bg right:35% w:300](https://asterion.federation.edu.au/uploads/logos/1771324993882_goukpfedzci.png)
