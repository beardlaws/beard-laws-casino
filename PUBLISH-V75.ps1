$ErrorActionPreference = "Stop"
Write-Host "Building Beard Laws Casino V75..." -ForegroundColor Cyan
npm install
npm run build
if (-not (Test-Path "dist/index.html")) { throw "Build completed without dist/index.html" }
if (Test-Path "docs") { Remove-Item "docs" -Recurse -Force }
Copy-Item "dist" "docs" -Recurse
"V75 AUDIO MOMENTS - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Set-Content "docs/VERSION.txt"
git add -A
git add -f docs
$changes = git status --porcelain
if ($changes) { git commit -m "V75 - Audio anticipation and casino feel" }
git push origin main
Write-Host "V75 pushed. Wait for GitHub Pages, then Ctrl+F5." -ForegroundColor Green
