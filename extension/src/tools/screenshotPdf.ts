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
    const pdfName = options.input.pdfPath.split(/[\\/]/).pop() ?? options.input.pdfPath;
    return {
      invocationMessage: `Extracting screenshots from ${options.input.pdfPath}…`,
      confirmationMessages: {
        title: `Screenshot PDF: ${pdfName}`,
        message: new vscode.MarkdownString(
          `Extract all pages from **${pdfName}** as PNG screenshots?\n\n` +
            `This will open the PDF and save images to \`PDF-Screenshots/\`.`
        ),
      },
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
      // Ensure PDF Toolkit is activated before calling its commands
      const pdfToolkit = vscode.extensions.getExtension(
        "TimHaintz.pdf-toolkit"
      );
      if (!pdfToolkit) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Error: PDF Toolkit extension (TimHaintz.pdf-toolkit) is not installed.\n` +
              `Install it from: https://marketplace.visualstudio.com/items?itemName=TimHaintz.pdf-toolkit`
          ),
        ]);
      }
      if (!pdfToolkit.isActive) {
        await pdfToolkit.activate();
      }

      // Open the PDF in VS Code — PDF Toolkit will handle it
      const pdfUri = vscode.Uri.file(absolutePath);
      await vscode.commands.executeCommand("vscode.open", pdfUri);

      // Let PDF Toolkit initialise the document (5s for reliability)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Trigger PDF Toolkit's "Extract All Pages" command
      // This extracts every page as a PNG to the PDF-Screenshots/ directory.
      await vscode.commands.executeCommand(
        "pdfToolkit.extractAllPages"
      );

      // Determine expected output directory
      const pdfBasename = path.basename(absolutePath, ".pdf");
      const screenshotsDir = path.join(
        workspaceFolder.uri.fsPath,
        "PDF-Screenshots",
        pdfBasename
      );

      // Poll for screenshots (up to 15 seconds) — PDF Toolkit may take
      // several seconds for large documents or when processing sequentially.
      let screenshotFiles: string[] = [];
      const maxWaitMs = 15000;
      const pollIntervalMs = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        if (fs.existsSync(screenshotsDir)) {
          screenshotFiles = fs
            .readdirSync(screenshotsDir)
            .filter((f) => /\.(png|jpe?g)$/i.test(f))
            .sort();
          if (screenshotFiles.length > 0) {
            // Wait one more beat — files may still be writing
            await new Promise((resolve) => setTimeout(resolve, 1000));
            screenshotFiles = fs
              .readdirSync(screenshotsDir)
              .filter((f) => /\.(png|jpe?g)$/i.test(f))
              .sort();
            break;
          }
        }
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
