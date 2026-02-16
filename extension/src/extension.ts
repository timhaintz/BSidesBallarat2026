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
import { SaveMarkdownTool } from "./tools/saveMarkdown";
import {
  handleResearcherRequest,
  ResearcherResultMetadata,
} from "./participant";

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

  context.subscriptions.push(
    vscode.lm.registerTool(
      "bsides-researcher_saveMarkdown",
      new SaveMarkdownTool()
    )
  );

  // ── Chat Participant ──────────────────────────────────────────────────
  const researcher = vscode.chat.createChatParticipant(
    "bsides.bsides-researcher",
    handleResearcherRequest
  );
  researcher.iconPath = new vscode.ThemeIcon("shield");

  // ── Followup Provider ─────────────────────────────────────────────────
  // After a response, suggest the user analyse any screenshot directories
  // that were produced during the conversation turn.
  researcher.followupProvider = {
    provideFollowups(
      result: vscode.ChatResult,
      _context: vscode.ChatContext,
      _token: vscode.CancellationToken
    ): vscode.ChatFollowup[] {
      const meta = result.metadata as ResearcherResultMetadata | undefined;
      if (!meta?.screenshotDirs || meta.screenshotDirs.length === 0) {
        return [];
      }

      const followups: vscode.ChatFollowup[] = [];

      // One followup per screenshot directory
      for (const dir of meta.screenshotDirs) {
        // dir is like "PDF-Screenshots/paper-name"
        const paperName = dir.includes("/")
          ? dir.split("/").pop()!
          : dir;

        followups.push({
          prompt: `Analyse the screenshots in ${dir}. Read the images and provide a detailed security research analysis with key findings and a Mermaid diagram.`,
          label: `Analyse ${paperName} screenshots`,
          participant: "bsides.bsides-researcher",
        });
      }

      // If multiple directories, add an "analyse all" option
      if (meta.screenshotDirs.length > 1) {
        const allDirs = meta.screenshotDirs.join(", ");
        followups.push({
          prompt: `Analyse all paper screenshots from these directories: ${allDirs}. Compare the papers and provide a comprehensive security research analysis with key findings and Mermaid diagrams.`,
          label: `Analyse all paper screenshots`,
          participant: "bsides.bsides-researcher",
        });
      }

      return followups;
    },
  };

  context.subscriptions.push(researcher);
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
  // Nothing to clean up — disposables handled by context.subscriptions.
}
