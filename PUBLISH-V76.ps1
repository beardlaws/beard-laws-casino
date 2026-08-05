$ErrorActionPreference = "Stop"
Write-Host "Building Beard Laws Casino V76..." -ForegroundColor Cyan
npm install
npm run build
if (-not (Test-Path "dist/index.html")) { throw "Build completed without dist/index.html" }
if (Test-Path "docs") { Remove-Item "docs" -Recurse -Force }
Copy-Item "dist" "docs" -Recurse
"V76 TRUTH AND PROGRESSION - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Set-Content "docs/VERSION.txt"
git add -A
git add -f docs
$changes = git status --porcelain
if ($changes) { git commit -m "V76 - Casino truth math and progression" }
git push origin main
Write-Host "V76 pushed. Wait for GitHub Pages, then Ctrl+F5." -ForegroundColor Green
