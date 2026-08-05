$ErrorActionPreference = "Stop"
Write-Host "Verifying V74..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File .\VERIFY-V74.ps1
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install
Write-Host "Building production casino..." -ForegroundColor Cyan
npm run build
if (!(Test-Path dist\index.html)) { throw "Build did not create dist/index.html" }
if (Test-Path docs) { Remove-Item docs -Recurse -Force }
Copy-Item dist docs -Recurse
"V74 MASTER STABILIZATION - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Set-Content docs\VERSION.txt
git add -A
git add -f docs
$changes = git status --porcelain
if ($changes) { git commit -m "V74 - Master stabilization, QA telemetry, Trophy Room, and Megh repair" } else { Write-Host "Nothing new to commit." -ForegroundColor Yellow }
git push origin main
Write-Host "V74 pushed successfully." -ForegroundColor Green
