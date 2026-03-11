---
name: discover-papers
description: Search for academic papers using Semantic Scholar MCP tools. Use when the user wants to find, search, or discover research papers on a topic. Handles keyword search, result presentation with metadata, and arXiv ID extraction via externalIds.
metadata:
  author: timhaintz
  version: "1.0"
  pipeline-step: "1-discover"
compatibility: Requires Semantic Scholar MCP server (semantic-scholar-mcp via uvx) configured in .vscode/mcp.json.
---

# Discover Papers via Semantic Scholar

Search for academic papers using the Semantic Scholar MCP tools and present results with actionable metadata.

## When to use this skill

Use this skill when:
- The user wants to find papers on a topic
- You need to search for academic research by keyword
- You need to look up a specific paper's metadata or arXiv ID

## Step 1: Search for papers

Call `search_papers` with the user's topic:

```
Tool: mcp_semanticschol_search_papers
Arguments:
  query: "<user's topic>"
  limit: 10
  fields: ["title", "authors", "year", "citationCount", "externalIds", "publicationDate"]
```

### Important notes on `fields`

- The `fields` parameter in `search_papers` may not return all requested fields — it often returns only titles
- This is a known limitation of the Semantic Scholar MCP server
- The `fields` parameter is largely ignored — `search_papers` typically returns only titles and authors regardless of what you request
- `externalIds` is **never returned** by the MCP server's `search_papers` or `get_paper` tools, even when explicitly requested
- To get full metadata including arXiv IDs, use `search_papers_match` with the exact paper title (see Step 3)

### Filtering by year

To filter papers by publication year, add the `year` parameter:

```
Tool: mcp_semanticschol_search_papers
Arguments:
  query: "prompt injection defense"
  year: 2026
  limit: 10
  fields: ["title", "authors", "year", "citationCount", "externalIds"]
```

The `year` parameter must be an **integer** (e.g., `2026`), not a string range. String ranges like `"2024-2026"` will cause an input validation error.

## Step 2: Present results

Present search results in a Markdown table with these columns:

| # | Title | Authors | Year | Citations | arXiv ID |
|---|---|---|---|---|---|
| 1 | Paper Title | First Author et al. | 2026 | 42 | 2602.01253 |

### Rules for presenting results

- Number each paper for easy reference
- Truncate author lists to "First Author et al." if more than 2 authors
- Show arXiv ID if available in `externalIds.ArXiv`, otherwise show "N/A"
- Sort by relevance (the default from Semantic Scholar)
- Recommend 2-4 most relevant papers for download
- Ask the user which papers they want to acquire before proceeding

## Step 3: Get full metadata and arXiv IDs for selected papers

When the user selects papers, call `search_papers_match` with the exact title to get complete metadata:

```
Tool: mcp_semanticschol_search_papers_match
Arguments:
  title: "MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents"
```

This returns full metadata including `external_ids`, `abstract`, `citation_count`, `venue`, and `authors`.

### Finding arXiv IDs

The `external_ids` field in the `search_papers_match` response may contain an arXiv ID:

```json
{
  "external_ids": {
    "ArXiv": "2502.05174",
    "DOI": "10.1234/example",
    "CorpusId": 123456789
  }
}
```

- If `ArXiv` is present → use the acquire-arxiv-papers skill to download it
- If `external_ids` is empty → the arXiv ID is not available via Semantic Scholar; search on `https://arxiv.org/search/` using the `web/fetch` tool, or use an arXiv ID from your training data

### Important: `get_paper` does NOT return externalIds

Despite the Semantic Scholar API documentation, the MCP server's `get_paper` tool does **not** return `externalIds` even when explicitly requested in the `fields` parameter. Use `search_papers_match` instead — it returns `external_ids` directly in its response object.

## Step 4: Explore related papers (optional)

If the user wants to find more related work:

**Citations (papers that cite this one):**
```
Tool: mcp_semanticschol_get_paper_citations
Arguments:
  paper_id: "<paperId>"
  fields: ["title", "authors", "year", "citationCount", "externalIds"]
```

**References (papers this one cites):**
```
Tool: mcp_semanticschol_get_paper_references
Arguments:
  paper_id: "<paperId>"
  fields: ["title", "authors", "year", "citationCount", "externalIds"]
```

## Tools to AVOID

- **Do NOT use `get_paper_fulltext`** — it converts PDFs to Markdown and is not needed for discovery
- **Do NOT rely on `openAccessPdf`** — it is unreliable and often returns empty URLs even for well-known open-access papers

## Rate limiting

- The Semantic Scholar API has rate limits (especially on the free tier)
- If you get `RateLimitError`, wait 60 seconds before retrying
- Do NOT retry immediately in a tight loop — the API returns `retry_after: 60`

## Example workflow

**User:** "Find papers on prompt injection defenses from 2025-2026"

**Agent actions:**
1. Call `search_papers` with query "prompt injection defense", year "2025-2026", limit 10
2. Present results table with title, authors, year, citations, arXiv ID
3. Recommend top 2-4 papers
4. Ask user which to download
5. For selected papers, call `get_paper` to get full metadata and confirm arXiv IDs
6. Hand off to the acquire-arxiv-papers skill for downloading
