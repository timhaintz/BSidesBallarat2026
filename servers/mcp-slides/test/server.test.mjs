import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "slides-test", version: "1.0.0" });
const resourceUri = "ui://bsides-slides/architecture.html";

before(async () => {
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "src/index.ts"],
    cwd: fileURLToPath(new URL("../", import.meta.url)),
  }));
});

after(async () => {
  await client.close();
});

test("architecture tool advertises its UI and returns all five pipeline stages", async () => {
  const { tools } = await client.listTools();
  const tool = tools.find(({ name }) => name === "show_architecture");
  assert.ok(tool);
  assert.equal(tool._meta.ui.resourceUri, resourceUri);
  const result = await client.callTool({ name: tool.name, arguments: {} });
  assert.notEqual(result.isError, true);
  const data = JSON.parse(result.content[0].text);
  assert.equal(data.highlight, "all");
  assert.deepEqual(data.stages.map(({ id }) => id), [
    "discover", "acquire", "render", "analyse", "visualise",
  ]);
});

test("architecture tool accepts each highlight and rejects an unknown stage", async () => {
  for (const highlightStage of ["discover", "acquire", "render", "analyse", "visualise"]) {
    const result = await client.callTool({
      name: "show_architecture", arguments: { highlightStage },
    });
    assert.notEqual(result.isError, true);
    assert.equal(JSON.parse(result.content[0].text).highlight, highlightStage);
  }
  const result = await client.callTool({
    name: "show_architecture", arguments: { highlightStage: "unknown" },
  });
  assert.equal(result.isError, true);
});

test("architecture resource serves its local HTML without fetching external services", async () => {
  const { resources } = await client.listResources();
  assert.ok(resources.some(({ uri }) => uri === resourceUri));
  const { contents } = await client.readResource({ uri: resourceUri });
  assert.equal(contents[0].uri, resourceUri);
  assert.match(contents[0].mimeType, /^text\/html/);
  assert.match(contents[0].text, /<!DOCTYPE html>/i);
  assert.match(contents[0].text, /BSides Ballarat/);
});
