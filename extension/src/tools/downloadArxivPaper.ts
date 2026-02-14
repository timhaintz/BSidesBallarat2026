/**
 * Download arXiv Paper — LM Tool
 *
 * Fetches a PDF from arXiv and saves it to the workspace `papers/` directory.
 * Uses the proven pattern: https://arxiv.org/pdf/<ARXIV_ID>
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

/** Input schema for the download tool. */
interface DownloadArxivPaperInput {
  arxivId: string;
  filename?: string;
}

/**
 * LM tool that downloads a paper from arXiv as a PDF.
 */
export class DownloadArxivPaperTool
  implements vscode.LanguageModelTool<DownloadArxivPaperInput>
{
  /**
   * Customize the progress message shown in the chat UI.
   */
  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<DownloadArxivPaperInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: `Downloading arXiv paper ${options.input.arxivId}…`,
    };
  }

  /**
   * Download the PDF from arXiv and save to papers/ directory.
   */
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<DownloadArxivPaperInput>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { arxivId, filename } = options.input;

    // Validate arXiv ID format (e.g., 2502.05174 or 1706.03762)
    if (!/^\d{4}\.\d{4,5}(v\d+)?$/.test(arxivId)) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Error: Invalid arXiv ID format "${arxivId}". Expected format like "2502.05174".`
        ),
      ]);
    }

    // Get workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          "Error: No workspace folder open. Please open a workspace first."
        ),
      ]);
    }

    // Determine output path
    const papersDir = path.join(workspaceFolder.uri.fsPath, "papers");
    const sanitisedFilename = filename
      ? filename.replace(/[^a-z0-9-]/gi, "-").toLowerCase()
      : arxivId.replace(".", "-");
    const outputPath = path.join(papersDir, `${sanitisedFilename}.pdf`);

    // Create papers/ directory if it doesn't exist
    if (!fs.existsSync(papersDir)) {
      fs.mkdirSync(papersDir, { recursive: true });
    }

    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Paper already exists at: ${outputPath}\nSkipping download. Delete the file to re-download.`
        ),
      ]);
    }

    // Download the PDF
    const url = `https://arxiv.org/pdf/${arxivId}`;
    try {
      await downloadFile(url, outputPath, token);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Error downloading paper: ${message}\nURL: ${url}`
        ),
      ]);
    }

    // Verify file was created and has content
    const stats = fs.statSync(outputPath);
    if (stats.size < 1000) {
      // PDFs should be much larger than 1KB
      fs.unlinkSync(outputPath);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Error: Downloaded file is too small (${stats.size} bytes) — likely not a valid PDF. The arXiv ID "${arxivId}" may be incorrect.`
        ),
      ]);
    }

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        `Successfully downloaded arXiv paper ${arxivId}.\n` +
          `Saved to: ${outputPath}\n` +
          `File size: ${(stats.size / 1024).toFixed(1)} KB\n` +
          `\nNext step: Use the screenshot_pdf tool to extract page images, or open the PDF with PDF Toolkit.`
      ),
    ]);
  }
}

/**
 * Download a file from a URL using HTTPS.
 * Follows redirects (arXiv uses 301/302 redirects).
 */
function downloadFile(
  url: string,
  outputPath: string,
  token: vscode.CancellationToken,
  maxRedirects = 5
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (token.isCancellationRequested) {
      reject(new Error("Download cancelled"));
      return;
    }

    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (BSides-Research-Assistant)",
        },
      },
      (response) => {
        // Handle redirects
        if (
          response.statusCode &&
          [301, 302, 303, 307, 308].includes(response.statusCode) &&
          response.headers.location
        ) {
          if (maxRedirects <= 0) {
            reject(new Error("Too many redirects"));
            return;
          }
          downloadFile(
            response.headers.location,
            outputPath,
            token,
            maxRedirects - 1
          )
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(
            new Error(
              `HTTP ${response.statusCode}: ${response.statusMessage}`
            )
          );
          return;
        }

        const file = fs.createWriteStream(outputPath);
        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve();
        });

        file.on("error", (err) => {
          fs.unlink(outputPath, () => {}); // Clean up partial file
          reject(err);
        });
      }
    );

    request.on("error", (err) => {
      reject(err);
    });

    // Handle cancellation
    token.onCancellationRequested(() => {
      request.destroy();
      fs.unlink(outputPath, () => {}); // Clean up partial file
      reject(new Error("Download cancelled"));
    });
  });
}
