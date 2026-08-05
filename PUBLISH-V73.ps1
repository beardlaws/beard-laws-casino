$ErrorActionPreference = "Stop"
Write-Host "Verifying V73..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File .\VERIFY-V73.ps1
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install
Write-Host "Building production casino..." -ForegroundColor Cyan
npm run build
if (Test-Path docs) { Remove-Item docs -Recurse -Force }
Copy-Item dist docs -Recurse
"V73 CASINO EVOLUTION - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Set-Content docs\VERSION.txt
git add -A
git add -f docs
$changes = git status --porcelain
if ($changes) { git commit -m "V73 - Beard Vault, expanded QA Lab, and casino evolution" } else { Write-Host "Nothing new to commit." -ForegroundColor Yellow }
git push origin main
Write-Host "V73 pushed successfully." -ForegroundColor Green
