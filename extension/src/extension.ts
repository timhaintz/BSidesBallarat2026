/**
 * BSides Researcher — VS Code Extension
 *
 * Registers the @bsides-researcher Chat Participant and LM tools for the
 * BSides Ballarat 2026 demo. Enables researchers to discover,
 * download, render, and analyse academic papers without leaving VS Code.
 *
 * Tools:
 *   - bsides-researcher_downloadArxivPaper  — fetch PDFs from arXiv
 *   - bsides-researcher_screenshotPdf       — extract page images via PDF Toolkit
 *
 * Chat Participant:
 *   - @bsides-researcher — natural language interface with /find, /download, /render, /workflow commands
 */

import * as vscode from "vscode";
import { DownloadArxivPaperTool } from "./tools/downloadArxivPaper";
import { ScreenshotPdfTool } from "./tools/screenshotPdf";
import { handleResearcherRequest } from "./participant";

/**
 * Called when the extension is activated.
 * Registers the Chat Participant and LM tools.
 */
export function activate(context: vscode.ExtensionContext): void {
  // ── LM Tools ──────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.lm.registerTool(
      "bsides-researcher_downloadArxivPaper",
      new DownloadArxivPaperTool()
    )
  );

  context.subscriptions.push(
    vscode.lm.registerTool(
      "bsides-researcher_screenshotPdf",
      new ScreenshotPdfTool()
    )
  );

  // ── Chat Participant ──────────────────────────────────────────────────
  const researcher = vscode.chat.createChatParticipant(
    "bsides.bsides-researcher",
    handleResearcherRequest
  );
  researcher.iconPath = new vscode.ThemeIcon("shield");

  context.subscriptions.push(researcher);
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
  // Nothing to clean up — disposables handled by context.subscriptions.
}
