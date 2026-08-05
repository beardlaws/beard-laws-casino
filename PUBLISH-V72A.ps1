$ErrorActionPreference = "Stop"
Write-Host "Verifying V72A..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File .\VERIFY-V72A.ps1
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install
Write-Host "Building V72A..." -ForegroundColor Cyan
npm run build
if (-not (Test-Path ".\dist\index.html")) { throw "Build did not create dist/index.html" }
if (Test-Path ".\docs") { Remove-Item ".\docs" -Recurse -Force }
Copy-Item ".\dist" ".\docs" -Recurse
"V72A ENGINE FOUNDATION - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Set-Content ".\docs\VERSION.txt"
git add -A
git add -f docs
$changes = git status --porcelain
if ($changes) { git commit -m "V72A - Shared reel, character, feature, and cabinet foundation" } else { Write-Host "No changes to commit." -ForegroundColor Yellow }
git push origin main
Write-Host "V72A published." -ForegroundColor Green
