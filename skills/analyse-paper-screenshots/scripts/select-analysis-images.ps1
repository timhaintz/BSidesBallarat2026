<#
.SYNOPSIS
    Selects a deterministic subset of screenshot images for analysis.

.DESCRIPTION
    Picks up to MaxImages PNGs from a screenshot directory while staying under the
    Copilot 20-image limit. The strategy prioritises the first 4 pages, then spreads
    the remaining selections across the rest of the paper.

.PARAMETER DirectoryName
    Screenshot directory name under PDF-Screenshots/ (for example, tracellm-prompt-engineering-requirements-traceability).

.PARAMETER MaxImages
    Maximum images to select. Default is 12.

.PARAMETER AsFileRefs
    Emit output as #file: references for easy pasting into chat.
#>
param(
    [Parameter(Mandatory)]
    [string]$DirectoryName,

    [int]$MaxImages = 12,

    [switch]$AsFileRefs
)

$ErrorActionPreference = "Stop"

if ($MaxImages -lt 1 -or $MaxImages -gt 20) {
    Write-Error "MaxImages must be between 1 and 20. Received: $MaxImages"
    exit 1
}

$projectRoot = Split-Path (Split-Path (Split-Path $PSScriptRoot))
$dirPath = Join-Path $projectRoot (Join-Path "PDF-Screenshots" $DirectoryName)

if (-not (Test-Path $dirPath)) {
    Write-Error "Screenshot directory not found: ${dirPath}"
    exit 1
}

$images = Get-ChildItem $dirPath -File -Filter "*.png" | Sort-Object Name
if ($images.Count -eq 0) {
    Write-Error "No PNG images found in ${dirPath}"
    exit 1
}

$selected = @()
if ($images.Count -le $MaxImages) {
    $selected = $images
}
else {
    $firstCount = [Math]::Min(4, $MaxImages)
    $selected += $images[0..($firstCount - 1)]

    $remainingSlots = $MaxImages - $firstCount
    if ($remainingSlots -gt 0) {
        $remainingImages = $images[$firstCount..($images.Count - 1)]
        if ($remainingSlots -ge $remainingImages.Count) {
            $selected += $remainingImages
        }
        elseif ($remainingSlots -eq 1) {
            $selected += $remainingImages[-1]
        }
        else {
            for ($i = 0; $i -lt $remainingSlots; $i++) {
                $idx = [Math]::Round($i * ($remainingImages.Count - 1) / ($remainingSlots - 1))
                $selected += $remainingImages[$idx]
            }
        }
    }

    $selected = $selected | Sort-Object Name -Unique
}

Write-Host "Selected $($selected.Count) of $($images.Count) images from ${DirectoryName}:"
foreach ($img in $selected) {
    $relativePath = "PDF-Screenshots/$DirectoryName/$($img.Name)"
    if ($AsFileRefs) {
        Write-Host "#file:$relativePath"
    }
    else {
        Write-Host $relativePath
    }
}
