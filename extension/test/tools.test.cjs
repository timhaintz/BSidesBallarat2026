const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const https = require("node:https");
const { after, beforeEach, test } = require("node:test");

const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), "bsides-tools-"));
const opened = [];
const vscode = {
  workspace: { workspaceFolders: [{ uri: { fsPath: workspacePath } }] },
  commands: { executeCommand: async (...args) => opened.push(args) },
  Uri: { file: (fsPath) => ({ fsPath }) },
  LanguageModelTextPart: class { constructor(value) { this.value = value; } },
  LanguageModelToolResult: class { constructor(content) { this.content = content; } },
};
const originalLoad = Module._load;
const originalGet = https.get;
https.get = () => { throw new Error("Network access is forbidden in offline tool tests"); };
Module._load = function (request, ...args) {
  return request === "vscode" ? vscode : originalLoad.call(this, request, ...args);
};
let SaveMarkdownTool;
let DownloadArxivPaperTool;
try {
  ({ SaveMarkdownTool } = require("../out/tools/saveMarkdown.js"));
  ({ DownloadArxivPaperTool } = require("../out/tools/downloadArxivPaper.js"));
} finally {
  Module._load = originalLoad;
}
const token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() {} }) };
const resultText = (result) => result.content.map(({ value }) => value).join("\n");

beforeEach(() => {
  vscode.workspace.workspaceFolders = [{ uri: { fsPath: workspacePath } }];
  opened.length = 0;
});
after(() => {
  https.get = originalGet;
  fs.rmSync(workspacePath, { recursive: true, force: true });
});

test("Markdown tool writes UTF-8 analysis and opens the saved document", async () => {
  const content = "# Research analysis\n\nDiscover → Analyse\n";
  const filePath = "papers/test-analysis.md";
  const result = await new SaveMarkdownTool().invoke({ input: { filePath, content } }, token);
  assert.match(resultText(result), /Successfully saved/);
  assert.equal(fs.readFileSync(path.join(workspacePath, filePath), "utf8"), content);
  assert.deepEqual(opened, [["vscode.open", { fsPath: path.join(workspacePath, filePath) }]]);
});

test("Markdown tool rejects a non-Markdown filename without creating a file", async () => {
  const result = await new SaveMarkdownTool().invoke({
    input: { filePath: "invalid.txt", content: "analysis" },
  }, token);
  assert.match(resultText(result), /must end with \.md/);
  assert.equal(fs.existsSync(path.join(workspacePath, "invalid.txt")), false);
  assert.deepEqual(opened, []);
});

test("tools report a missing workspace before writing or downloading", async () => {
  vscode.workspace.workspaceFolders = undefined;
  for (const [tool, input] of [
    [new SaveMarkdownTool(), { filePath: "test.md", content: "analysis" }],
    [new DownloadArxivPaperTool(), { arxivId: "2502.05174" }],
  ]) {
    assert.match(resultText(await tool.invoke({ input }, token)), /No workspace folder/);
  }
});

test("download tool rejects invalid identifiers without network access", async () => {
  const result = await new DownloadArxivPaperTool().invoke({
    input: { arxivId: "invalid/id" },
  }, token);
  assert.match(resultText(result), /Invalid arXiv ID/);
});

test("download tool reuses an existing paper with a sanitised filename", async () => {
  const papersDir = path.join(workspacePath, "papers");
  fs.mkdirSync(papersDir, { recursive: true });
  const paperPath = path.join(papersDir, "test-paper.pdf");
  const existing = Buffer.from("existing paper");
  fs.writeFileSync(paperPath, existing);
  const result = await new DownloadArxivPaperTool().invoke({
    input: { arxivId: "2502.05174", filename: "Test Paper" },
  }, token);
  assert.match(resultText(result), /Skipping download/);
  assert.deepEqual(fs.readFileSync(paperPath), existing);
});
