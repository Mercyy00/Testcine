# Safe zip creation script for Vivarium
# Excludes dependencies, builds, git metadata, and all secret/environment files

$source = Get-Location
$destination = Join-Path $source "vivarium_clean.zip"

if (Test-Path $destination) {
    Remove-Item -Force $destination
}

$excludePatterns = @(
    "node_modules",
    ".next",
    ".next-test",
    ".git",
    ".env*",
    "test-results",
    "playwright-report",
    "*.zip"
)

Write-Host "Creating clean zip archive excluding: $($excludePatterns -join ', ')..."

$files = Get-ChildItem -Path . -Recurse | Where-Object {
    $itemPath = $_.FullName.Substring($source.Path.Length + 1)
    $shouldExclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($pattern.StartsWith("*") -and $_.Name -like $pattern) {
            $shouldExclude = $true
            break
        }
        if ($itemPath -like "$pattern*" -or $itemPath -like "*\$pattern*" -or $_.Name -like $pattern) {
            $shouldExclude = $true
            break
        }
    }
    -not $shouldExclude
}

# Use Compress-Archive with filtered files
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    foreach ($file in $files) {
        if (-not $file.PSIsContainer) {
            $rel = $file.FullName.Substring($source.Path.Length + 1)
            $destFile = Join-Path $tempDir $rel
            $destParent = Split-Path $destFile -Parent
            if (-not (Test-Path $destParent)) {
                New-Item -ItemType Directory -Path $destParent -Force | Out-Null
            }
            Copy-Item $file.FullName -Destination $destFile
        }
    }
    Compress-Archive -Path "$tempDir\*" -DestinationPath $destination -CompressionLevel Optimal
    Write-Host "Archive created successfully at $destination"
} finally {
    Remove-Item -Recurse -Force $tempDir
}
