<#
.SYNOPSIS
    Downloads a paper PDF from arXiv.

.DESCRIPTION
    Downloads a paper from arXiv given its arXiv ID and saves it to the papers/ directory.
    Uses Invoke-WebRequest with -UseBasicParsing (required for PowerShell 5.1) and a
    User-Agent header (required by arXiv).

.PARAMETER ArxivId
    The arXiv paper ID (e.g., "2502.05174" or "2602.01253").

.PARAMETER Filename
    The output filename (kebab-case, ending in .pdf). Saved to papers/ directory.

.EXAMPLE
    .\scripts\download-arxiv-paper.ps1 -ArxivId "2602.01253" -Filename "tracellm-prompt-engineering-requirements-traceability.pdf"

.EXAMPLE
    .\scripts\download-arxiv-paper.ps1 -ArxivId "2502.05174" -Filename "melon-provable-defense-prompt-injection.pdf"
#>
param(
    [Parameter(Mandatory, HelpMessage = "arXiv paper ID (e.g., 2602.01253)")]
    [ValidatePattern('^\d{4}\.\d{4,5}(v\d+)?$')]
    [string]$ArxivId,

    [Parameter(Mandatory, HelpMessage = "Output filename (kebab-case, .pdf extension)")]
    [ValidatePattern('^[a-z0-9][a-z0-9\-]+\.pdf$')]
    [string]$Filename
)

$ErrorActionPreference = "Stop"

# Ensure papers/ directory exists — navigate from scripts/ up to project root
$projectRoot = Split-Path (Split-Path (Split-Path $PSScriptRoot))
$papersDir = Join-Path $projectRoot "papers"
if (-not (Test-Path $papersDir)) {
    New-Item -ItemType Directory -Path $papersDir -Force | Out-Null
}

$outPath = Join-Path $papersDir $Filename
$pdfUrl = "https://arxiv.org/pdf/$ArxivId"

Write-Host "Downloading: $pdfUrl"
Write-Host "Saving to:   $outPath"

Invoke-WebRequest -Uri $pdfUrl -OutFile $outPath -UserAgent "Mozilla/5.0" -UseBasicParsing

# Verify download
if (Test-Path $outPath) {
    $sizeKB = [math]::Round((Get-Item $outPath).Length / 1KB, 1)
    if ($sizeKB -lt 10) {
        Write-Error "Download may have failed - file is only ${sizeKB} KB. Expected 200+ KB for a paper PDF. The file may contain an HTML error page instead of a PDF."
        exit 1
    }
    Write-Host "Success: ${Filename} - ${sizeKB} KB"
}
else {
    Write-Error "Download failed - file not found at ${outPath}"
    exit 1
}
