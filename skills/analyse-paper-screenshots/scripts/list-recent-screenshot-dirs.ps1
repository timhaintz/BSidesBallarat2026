<#
.SYNOPSIS
    Lists recently updated screenshot directories in PDF-Screenshots/.

.DESCRIPTION
    Finds screenshot directories whose image files were updated within the specified
    number of minutes. Used to identify screenshot sets produced by the most recent
    render step.

.PARAMETER MinutesAgo
    How many minutes back to look. Default is 120.
#>
param(
    [int]$MinutesAgo = 120
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path (Split-Path (Split-Path $PSScriptRoot))
$screenshotsRoot = Join-Path $projectRoot "PDF-Screenshots"

if (-not (Test-Path $screenshotsRoot)) {
    Write-Error "PDF-Screenshots directory not found at ${screenshotsRoot}"
    exit 1
}

$cutoff = (Get-Date).AddMinutes(-$MinutesAgo)
$recentDirs = @()

Get-ChildItem $screenshotsRoot -Directory | ForEach-Object {
    $dir = $_
    $images = Get-ChildItem $dir.FullName -File -Filter "*.png" | Sort-Object LastWriteTime -Descending
    if ($images.Count -gt 0 -and $images[0].LastWriteTime -gt $cutoff) {
        $recentDirs += [PSCustomObject]@{
            Name        = $dir.Name
            ImageCount  = $images.Count
            LastUpdated = $images[0].LastWriteTime
        }
    }
}

$recentDirs = @($recentDirs | Sort-Object LastUpdated -Descending)
$recentCount = $recentDirs.Count

if ($recentCount -eq 0) {
    Write-Host "No screenshot directories updated in the last ${MinutesAgo} minutes."
    exit 0
}

$label = if ($recentCount -eq 1) { "directory" } else { "directories" }
Write-Host "Found ${recentCount} recent screenshot ${label}:"
foreach ($dir in $recentDirs) {
    $age = [math]::Round(((Get-Date) - $dir.LastUpdated).TotalMinutes, 0)
    Write-Host "  $($dir.Name) - $($dir.ImageCount) images - $age min ago"
}

$recentDirs | ForEach-Object { $_.Name }
