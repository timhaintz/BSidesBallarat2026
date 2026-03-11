<#
.SYNOPSIS
    Lists recently downloaded PDFs in the papers/ directory.

.DESCRIPTION
    Finds PDF files in papers/ that were modified within the specified number of minutes.
    Used to identify papers from the most recent acquire step so the render skill
    can automatically screenshot only those papers.

.PARAMETER MinutesAgo
    How many minutes back to look. Default is 30.

.EXAMPLE
    .\scripts\list-recent-papers.ps1
    Lists papers downloaded in the last 30 minutes.

.EXAMPLE
    .\scripts\list-recent-papers.ps1 -MinutesAgo 60
    Lists papers downloaded in the last 60 minutes.
#>
param(
    [int]$MinutesAgo = 30
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path (Split-Path (Split-Path $PSScriptRoot))
$papersDir = Join-Path $projectRoot "papers"

if (-not (Test-Path $papersDir)) {
    Write-Error "papers/ directory not found at ${papersDir}"
    exit 1
}

$cutoff = (Get-Date).AddMinutes(-$MinutesAgo)
$recentPdfs = Get-ChildItem $papersDir -Filter "*.pdf" |
Where-Object { $_.LastWriteTime -gt $cutoff } |
Sort-Object LastWriteTime -Descending

if ($recentPdfs.Count -eq 0) {
    Write-Host "No PDFs downloaded in the last ${MinutesAgo} minutes."
    exit 0
}

Write-Host "Found $($recentPdfs.Count) recent PDF(s):"
foreach ($pdf in $recentPdfs) {
    $sizeKB = [math]::Round($pdf.Length / 1KB, 1)
    $age = [math]::Round(((Get-Date) - $pdf.LastWriteTime).TotalMinutes, 0)
    $name = $pdf.Name
    Write-Host "  $name - $sizeKB KB - $age min ago"
}

# Output just the filenames for piping to the render step
$recentPdfs | ForEach-Object { $_.Name }
