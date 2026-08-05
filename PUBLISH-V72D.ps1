$ErrorActionPreference = "Stop"
Write-Host "Verifying V72D..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File .\VERIFY-V72D.ps1
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install
Write-Host "Building production casino..." -ForegroundColor Cyan
npm run build
if (Test-Path docs) { Remove-Item docs -Recurse -Force }
Copy-Item dist docs -Recurse
"V72D NEEMA SHOWCASE + QA LAB - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Set-Content docs\VERSION.txt
git add -A
git add -f docs
$changes = git status --porcelain
if ($changes) { git commit -m "V72D - Neema showcase, Megh gravity, and QA feature lab" } else { Write-Host "Nothing new to commit." -ForegroundColor Yellow }
git push origin main
Write-Host "V72D pushed successfully." -ForegroundColor Green
