# Reorganize project: frontend -> frontend/, uploads at root
# Run from project root: student_system/
# Usage: .\reorganize.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# 1) Create frontend/ and uploads/ if not exist
New-Item -ItemType Directory -Force -Path (Join-Path $root "frontend") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $root "uploads") | Out-Null

# 2) Move frontend files and folders into frontend/
$frontendItems = @(
    "package.json", "package-lock.json", "vite.config.ts", "tsconfig.json",
    "index.html", "App.tsx", "index.tsx", "types.ts",
    "components", "constants", "contexts", "hooks", "i18n", "public", "services", "images"
)
foreach ($item in $frontendItems) {
    $src = Join-Path $root $item
    $dst = Join-Path (Join-Path $root "frontend") $item
    if (Test-Path $src) {
        if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
        Move-Item -Path $src -Destination $dst -Force
        Write-Host "Moved: $item -> frontend/"
    }
}

# 3) Move existing backend/uploads/* to root uploads/
$backendUploads = Join-Path (Join-Path $root "backend") "uploads"
if (Test-Path $backendUploads) {
    Get-ChildItem -Path $backendUploads -File | ForEach-Object {
        $dest = Join-Path (Join-Path $root "uploads") $_.Name
        Move-Item -Path $_.FullName -Destination $dest -Force
        Write-Host "Moved upload: $($_.Name) -> uploads/"
    }
    # Remove empty backend/uploads if empty
    if (-not (Get-ChildItem $backendUploads -Force)) { Remove-Item $backendUploads -Force }
}

Write-Host "Done. Run backend from backend/ and frontend from frontend/."
