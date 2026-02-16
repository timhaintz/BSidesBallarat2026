/**
 * Save Markdown — LM Tool
 *
 * Saves analysis content as a Markdown file in the workspace.
 * Used to persist research analysis, Mermaid diagrams, and summaries.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/** Input schema for the save markdown tool. */
interface SaveMarkdownInput {
  /** Workspace-relative file path (e.g., "papers/prompt-injection-analysis.md"). */
  filePath: string;
  /** Markdown content to write to the file. */
  content: string;
}

/**
 * LM tool that saves Markdown content to a file in the workspace.
 */
export class SaveMarkdownTool
  implements vscode.LanguageModelTool<SaveMarkdownInput>
{
  /**
   * Customize the progress message shown in the chat UI.
   */
  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<SaveMarkdownInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: `Saving analysis to ${options.input.filePath}…`,
    };
  }

  /**
   * Write Markdown content to a file in the workspace.
   */
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<SaveMarkdownInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { filePath, content } = options.input;

    // Get workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          "Error: No workspace folder open. Please open a workspace first."
        ),
      ]);
    }

    // Resolve to absolute path
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(workspaceFolder.uri.fsPath, filePath);

    // Ensure it's a Markdown file
    if (!absolutePath.toLowerCase().endsWith(".md")) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Error: File path must end with .md — got "${filePath}".`
        ),
      ]);
    }

    // Ensure the parent directory exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      fs.writeFileSync(absolutePath, content, "utf-8");

      const stats = fs.statSync(absolutePath);
      const sizeKb = (stats.size / 1024).toFixed(1);

      // Open the file in the editor so the user can see it
      const uri = vscode.Uri.file(absolutePath);
      await vscode.commands.executeCommand("vscode.open", uri);

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Successfully saved analysis to: ${filePath}\n` +
            `File size: ${sizeKb} KB\n` +
            `The file has been opened in the editor.\n\n` +
            `Tip: Use the Markdown preview (Ctrl+Shift+V) to see rendered Mermaid diagrams ` +
            `(requires the bierner.markdown-mermaid extension).`
        ),
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Error saving file: ${message}`
        ),
      ]);
    }
  }
}
