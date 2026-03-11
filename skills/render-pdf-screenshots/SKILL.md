---
name: render-pdf-screenshots
description: Extract page screenshots from PDF papers using PDF Toolkit extension. Use when the user wants to render, screenshot, or extract images from downloaded PDFs. Automatically processes recently downloaded papers from the acquire step.
metadata:
  author: timhaintz
  version: "1.0"
  pipeline-step: "3-render"
compatibility: Requires VS Code with PDF Toolkit extension (TimHaintz.pdf-toolkit v2.1.0+) installed.
---

# Render PDF Screenshots via PDF Toolkit

Extract every page of a paper PDF as a PNG screenshot using the PDF Toolkit VS Code extension. Screenshots are saved to `PDF-Screenshots/<paper-name>/`.

## When to use this skill

Use this skill when:
- Papers have been downloaded in the acquire step and need to be rendered as images
- The user wants to screenshot PDF pages for multimodal analysis
- You need to prepare PDF content for the analyse step

## Available scripts

- **`scripts/list-recent-papers.ps1`** — Lists PDFs downloaded in the last N minutes (default: 30)

## Step 1: Identify which papers to render

Run the list-recent-papers script to find papers from the most recent acquire step:

```powershell
.\skills\render-pdf-screenshots\scripts\list-recent-papers.ps1
```

Or with a custom time window:

```powershell
.\skills\render-pdf-screenshots\scripts\list-recent-papers.ps1 -MinutesAgo 60
```

If no papers were recently downloaded, ask the user which papers in `papers/` they want to render.

## Step 2: For each paper, open and screenshot

Process papers **one at a time** using this exact sequence:

### 2a. Open the PDF in VS Code (PDF Toolkit handles it)

Run in the terminal:

```powershell
code "papers/<filename>.pdf"
```

This opens the PDF in VS Code where PDF Toolkit is the registered PDF viewer.

### 2b. Wait for PDF Toolkit to render

Wait **5 seconds** for PDF Toolkit to initialize and render the PDF:

```powershell
Start-Sleep -Seconds 5
```

### 2c. Screenshot all pages

Call the VS Code command:

```
Tool: run_vscode_command
Arguments:
  commandId: pdfToolkit.extractAllPages
  name: Screenshot all PDF pages
  skipCheck: true
```

This extracts every page as a PNG to `PDF-Screenshots/<paper-name>/`.

### 2d. Wait for screenshots to finish writing

Wait **10 seconds** for all page images to be written to disk (large PDFs take longer):

```powershell
Start-Sleep -Seconds 10
```

### 2e. Verify screenshots were created

```powershell
$paperName = "<filename-without-extension>"
$dir = "PDF-Screenshots/$paperName"
if (Test-Path $dir) {
    $count = (Get-ChildItem $dir -File -Filter "*.png").Count
    Write-Host "$paperName : $count screenshots"
} else {
    Write-Host "ERROR: No screenshots directory found for $paperName"
}
```

## Step 3: Report results

After processing all papers, present a summary:

| Paper | Screenshots | Directory |
|---|---|---|
| tracellm-prompt-engineering-requirements-traceability | 49 | PDF-Screenshots/tracellm-prompt-engineering-requirements-traceability/ |

## Step 4: Remind about the image limit

**Important:** GitHub Copilot has a **20 image limit per chat conversation** (across the entire history, not per message). When the user moves to the analyse step:

- A typical 7-page paper is fine on its own
- For papers with more pages, suggest using PDF Toolkit's `Screenshot Custom...` to select specific pages (abstract, methodology, results, key figures)
- For multiple papers, suggest analysing each in a **separate chat session**

## Processing multiple papers

Repeat Step 2 (2a through 2e) for each paper sequentially. Do NOT try to batch them — each PDF must be the active editor when `extractAllPages` is called.

## Timing notes

- **5 seconds** after opening: PDF Toolkit needs time to initialize the PDF viewer
- **10 seconds** after extracting: large PDFs (30+ pages) need time for all PNGs to be written
- If screenshots are missing, increase the wait times and retry
