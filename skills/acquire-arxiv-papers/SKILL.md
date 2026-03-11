---
name: acquire-arxiv-papers
description: Download academic papers from arXiv as PDFs. Use when the user wants to download, acquire, or get papers from arXiv given paper titles or arXiv IDs. Handles arXiv ID lookup via Semantic Scholar externalIds or arXiv website search, then downloads PDFs using PowerShell Invoke-WebRequest.
metadata:
  author: timhaintz
  version: "1.0"
  pipeline-step: "2-acquire"
compatibility: Requires PowerShell (Windows). Uses Invoke-WebRequest with -UseBasicParsing.
---

# Acquire Papers from arXiv

Download academic paper PDFs from arXiv to the `papers/` directory.

## When to use this skill

Use this skill when:
- The user wants to download a paper from arXiv
- You have an arXiv ID and need to download the PDF
- You have a paper title from Semantic Scholar and need to find its arXiv ID then download it

## Step 1: Find the arXiv ID

If you already have the arXiv ID (e.g., `2502.05174`), skip to Step 2.

**Method A — Semantic Scholar externalIds (preferred):**
1. Call `get_paper` with the paper's Semantic Scholar ID and `fields=["externalIds"]`
2. Look for the `ArXiv` field in the `externalIds` response
3. If present, use that as the arXiv ID

**Method B — arXiv website search (fallback):**
1. Use the `web/fetch` tool to search `https://arxiv.org/search/?query=<URL-encoded-title>&searchtype=all`
2. Find the arXiv ID in the search results page

**Method C — Training data:**
If you already know the arXiv ID for a well-known paper from your training data, use it directly.

### Methods to AVOID

- **Do NOT use the arXiv API** (`export.arxiv.org/api/query`) — it uses keyword matching, not exact title search, and frequently returns wrong papers with similar keywords
- **Do NOT use `openAccessPdf`** from Semantic Scholar — it is unreliable and often returns empty URLs even for well-known open-access papers
- **Do NOT use `get_paper_fulltext`** — it converts PDFs to Markdown and loses the visual layout

## Step 2: Download the PDF

Use the bundled download script — **one paper per command, no batching**:

```powershell
.\skills\acquire-arxiv-papers\scripts\download-arxiv-paper.ps1 -ArxivId "<ARXIV_ID>" -Filename "<descriptive-kebab-case-name>.pdf"
```

### Available scripts

- **`scripts/download-arxiv-paper.ps1`** — Downloads a paper PDF from arXiv to the `papers/` directory. Handles `-UseBasicParsing`, `-UserAgent`, directory creation, and download verification automatically.

### Examples

```powershell
.\skills\acquire-arxiv-papers\scripts\download-arxiv-paper.ps1 -ArxivId "2602.01253" -Filename "tracellm-prompt-engineering-requirements-traceability.pdf"
```

```powershell
.\skills\acquire-arxiv-papers\scripts\download-arxiv-paper.ps1 -ArxivId "2502.05174" -Filename "melon-provable-defense-prompt-injection.pdf"
```

### Parameters

| Parameter | Required | Description |
|---|---|---|
| `-ArxivId` | Yes | arXiv paper ID (e.g., `2602.01253`). Validated format: `YYMM.NNNNN` |
| `-Filename` | Yes | Output filename, kebab-case with `.pdf` extension (e.g., `my-paper-name.pdf`) |

### What the script does

1. Constructs the PDF URL: `https://arxiv.org/pdf/<ArxivId>`
2. Downloads using `Invoke-WebRequest` with `-UseBasicParsing` and `-UserAgent "Mozilla/5.0"`
3. Saves to the `papers/` directory (creates it if needed)
4. Verifies the file exists and is > 10 KB (rejects HTML error pages)
5. Reports success with file size

### Do NOT bypass the script

- Do NOT call `Invoke-WebRequest` directly — the script enforces all required flags
- Do NOT use `System.Net.WebClient`, `curl`, or `Start-BitsTransfer`
- Do NOT batch multiple downloads — run the script once per paper

## Non-arXiv papers

Not all papers are on arXiv. If the arXiv ID is not found:
1. Check `externalIds` from Semantic Scholar for a DOI
2. Use the DOI to find the publisher's direct PDF link
3. Download from the publisher using the same `Invoke-WebRequest` pattern
