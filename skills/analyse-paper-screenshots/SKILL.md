---
name: analyse-paper-screenshots
description: Analyse paper screenshot images in Copilot Chat. Use when PDF pages have been rendered to PNG files and you need a deterministic, multimodal analysis workflow that stays under Copilot's 20-image limit.
metadata:
  author: timhaintz
  version: "1.0"
  pipeline-step: "4-analyse"
compatibility: Requires screenshot PNGs in PDF-Screenshots/ and GitHub Copilot Chat image attachments via #file: references.
---

# Analyse Paper Screenshots

Analyse rendered paper screenshots in Copilot Chat using a deterministic image-selection workflow that stays under the Copilot 20-image ceiling.

## When to use this skill

Use this skill when:
- A paper has already been rendered into PNG screenshots under `PDF-Screenshots/`
- You want multimodal analysis of the actual page images
- You want a repeatable process that avoids demo failures from attaching too many images

## Available scripts

- **`scripts/list-recent-screenshot-dirs.ps1`** — Finds screenshot directories produced by the most recent render step
- **`scripts/select-analysis-images.ps1`** — Selects a deterministic subset of screenshots for analysis and can emit `#file:` references

## Critical constraint: Copilot image limit

GitHub Copilot has a **hard 20-image limit across the entire chat conversation history**, not just the current message.

Rules:
- Start a **new chat session** before analysing a new paper if the current conversation already contains images
- Analyse **one paper per conversation** unless the total selected images across all papers is comfortably below 20
- Default to **12 images per paper** to leave headroom for follow-up questions or one or two extra pages

## Step 1: Identify which screenshot directory to analyse

If screenshots were just created, run:

```powershell
.\skills\analyse-paper-screenshots\scripts\list-recent-screenshot-dirs.ps1
```

If no recent directories are found, inspect `PDF-Screenshots/` and choose the paper directory explicitly.

## Step 2: Select a safe subset of images

Run the selector script:

```powershell
.\skills\analyse-paper-screenshots\scripts\select-analysis-images.ps1 -DirectoryName "<paper-dir>" -MaxImages 12 -AsFileRefs
```

### Selection strategy

The script applies a deterministic rule:
1. Always include the **first 4 pages**
2. Spread the remaining selected images across the rest of the paper
3. Cap the total at `MaxImages` (default 12)

This prioritises title/abstract/introduction pages while still sampling methods, results, and conclusion pages later in the paper.

## Step 3: Attach the selected images to chat

Take the `#file:` lines from the script output and add them to a new Copilot Chat message.

Example:

```text
#file:PDF-Screenshots/tracellm-prompt-engineering-requirements-traceability/page_001.png
#file:PDF-Screenshots/tracellm-prompt-engineering-requirements-traceability/page_002.png
#file:PDF-Screenshots/tracellm-prompt-engineering-requirements-traceability/page_003.png
```

## Step 4: Use the proven analysis prompt

Use this prompt pattern:

```text
Analyse the screenshots in PDF-Screenshots/<paper-dir>. Read the images and provide a detailed security research analysis with:
- key contributions
- threat model or problem framing
- attack vectors or defense mechanisms
- architecture / method summary
- evaluation setup and main results
- limitations and open questions
- one Mermaid diagram visualising the core workflow or taxonomy
```

This matches the proven prompt shape already used by the extension follow-up suggestions.

## Step 5: Structure the response

The analysis should include these sections:
- Paper summary
- Key contributions
- Threat model / research problem
- Method / architecture
- Evaluation and results
- Limitations
- Mermaid diagram
- Recommended next steps

## Multiple-paper comparison

If comparing multiple papers:
- Use a **separate chat session** for each paper first
- Keep each paper's image set under 12 images
- After individual analyses exist, compare the resulting Markdown summaries or reduced notes instead of attaching all screenshots from multiple papers at once

## Failure modes and recovery

- If Copilot returns a too-many-images error: start a new chat and reduce `-MaxImages`
- If the paper is long (30+ pages): try `-MaxImages 8` first
- If important figures are missing: rerun the selector with a higher `-MaxImages` up to 20, but only in a fresh chat
- If page selection misses a needed section: manually add one or two extra `#file:` references, staying below the overall limit
