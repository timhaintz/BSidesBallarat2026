/**
 * Screenshot PDF — LM Tool
 *
 * Invokes PDF Toolkit's "Screenshot All Pages" command via
 * `vscode.commands.executeCommand()` to extract page images from a PDF.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/** Input schema for the screenshot tool. */
interface ScreenshotPdfInput {
  pdfPath: string;
}

/**
 * LM tool that opens a PDF and extracts page screenshots using PDF Toolkit.
 */
export class ScreenshotPdfTool
  implements vscode.LanguageModelTool<ScreenshotPdfInput>
{
  /**
   * Customize the progress message shown in the chat UI.
   */
  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<ScreenshotPdfInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: `Extracting screenshots from ${options.input.pdfPath}…`,
    };
  }

  /**
   * Open the PDF in VS Code and trigger PDF Toolkit's screenshot command.
   */
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ScreenshotPdfInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { pdfPath } = options.input;

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
    const absolutePath = path.isAbsolute(pdfPath)
      ? pdfPath
      : path.join(workspaceFolder.uri.fsPath, pdfPath);

    // Check PDF exists
    if (!fs.existsSync(absolutePath)) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Error: PDF file not found at "${absolutePath}".\n` +
            `Use the download_arxiv_paper tool first to download the paper.`
        ),
      ]);
    }

    // Verify it's a PDF
    if (!absolutePath.toLowerCase().endsWith(".pdf")) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Error: File "${pdfPath}" is not a PDF file.`
        ),
      ]);
    }

    try {
      // Open the PDF in VS Code — PDF Toolkit will handle it
      const pdfUri = vscode.Uri.file(absolutePath);
      await vscode.commands.executeCommand("vscode.open", pdfUri);

      // Small delay to let PDF Toolkit initialise the document
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Trigger PDF Toolkit's "Screenshot All Pages" command
      // This extracts every page as a PNG to the PDF-Screenshots/ directory.
      await vscode.commands.executeCommand(
        "pdf-toolkit.screenshotAllPages"
      );

      // Determine expected output directory
      const pdfBasename = path.basename(absolutePath, ".pdf");
      const screenshotsDir = path.join(
        workspaceFolder.uri.fsPath,
        "PDF-Screenshots",
        pdfBasename
      );

      // Wait for screenshots to be generated
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check if screenshots were created
      let screenshotFiles: string[] = [];
      if (fs.existsSync(screenshotsDir)) {
        screenshotFiles = fs
          .readdirSync(screenshotsDir)
          .filter((f) => /\.(png|jpe?g)$/i.test(f))
          .sort();
      }

      if (screenshotFiles.length > 0) {
        const filePaths = screenshotFiles
          .map((f) => `  - PDF-Screenshots/${pdfBasename}/${f}`)
          .join("\n");

        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Successfully extracted ${screenshotFiles.length} page screenshot(s) from "${pdfPath}".\n\n` +
              `Screenshots saved to: PDF-Screenshots/${pdfBasename}/\n\n` +
              `Files:\n${filePaths}\n\n` +
              `Next step: Attach these images to Copilot Chat using #file: references for multimodal analysis.`
          ),
        ]);
      } else {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `PDF opened and screenshot command triggered for "${pdfPath}".\n` +
              `The screenshots may still be generating. Check the PDF-Screenshots/ directory.\n` +
              `If PDF Toolkit is not installed, install it from: https://marketplace.visualstudio.com/items?itemName=TimHaintz.pdf-toolkit`
          ),
        ]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Error processing PDF: ${message}\n` +
            `Ensure PDF Toolkit (TimHaintz.pdf-toolkit) is installed.`
        ),
      ]);
    }
  }
}
