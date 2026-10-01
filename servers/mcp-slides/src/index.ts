/**
 * BSides Ballarat 2026 — MCP Apps Server
 *
 * Provides interactive HTML diagrams that render inline in Copilot Chat.
 * Uses stdio transport so VS Code can launch it from .vscode/mcp.json.
 *
 * Tools:
 *   - show_architecture: Interactive pipeline diagram (Discover → Analyse → Visualise)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import fs from "node:fs/promises";

const server = new McpServer({
  name: "bsides-mcp-slides",
  version: "1.0.0",
});

// ─── Architecture Pipeline Diagram ──────────────────────────────────────────

const architectureResourceUri = "ui://bsides-slides/architecture.html";

registerAppTool(
  server,
  "show_architecture",
  {
    title: "Show Architecture Diagram",
    description:
      "Displays an interactive architecture diagram of the BSides Ballarat Research Assistant pipeline. " +
      "Shows the five-stage workflow: Discover → Acquire → Render → Analyse → Visualise, " +
      "with the tools and technologies used at each stage. " +
      "Call this tool when the user asks to see the architecture, pipeline, or workflow diagram.",
    inputSchema: {
      highlightStage: z
        .enum(["discover", "acquire", "render", "analyse", "visualise"])
        .optional()
        .describe(
          "Optional: highlight a specific pipeline stage (discover, acquire, render, analyse, visualise)",
        ),
    },
    _meta: { ui: {
      resourceUri: architectureResourceUri,
      csp: { resourceDomains: ["https://esm.sh"] },
    } },
  },
  async (args: { highlightStage?: string }) => {
    const stage = args.highlightStage ?? "all";
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            pipeline: "BSides Ballarat Research Assistant",
            stages: [
              { id: "discover", label: "Discover", tool: "Semantic Scholar MCP", icon: "🔍" },
              { id: "acquire", label: "Acquire", tool: "arXiv PDF Download", icon: "📥" },
              { id: "render", label: "Render", tool: "PDF Toolkit Extension", icon: "🖼️" },
              { id: "analyse", label: "Analyse", tool: "Copilot Chat + #file:", icon: "🧠" },
              { id: "visualise", label: "Visualise", tool: "Mermaid + Markdown", icon: "📊" },
            ],
            highlight: stage,
          }),
        },
      ],
    };
  },
);

registerAppResource(
  server,
  architectureResourceUri,
  architectureResourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    const html = await fs.readFile(
      new URL("./ui/architecture.html", import.meta.url),
      "utf-8",
    );
    return {
      contents: [
        { uri: architectureResourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
      ],
    };
  },
);

// ─── Start server ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting MCP Apps server:", err);
  process.exit(1);
});
