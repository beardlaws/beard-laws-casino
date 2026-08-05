$ErrorActionPreference = "Stop"
Write-Host "Building Beard Laws Casino V70..." -ForegroundColor Cyan
npm install
npm run build
if (Test-Path .\docs) { Remove-Item .\docs -Recurse -Force }
Copy-Item .\dist .\docs -Recurse
"V70 EXPERIENCE UPGRADE - READABLE GOATS UFO + BARBER POLISH - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Set-Content .\docs\VERSION.txt
Write-Host "Production build copied to docs." -ForegroundColor Green
git add -A
git add -f docs
$changes = git status --porcelain
if ($changes) {
  git commit -m "V70 - Experience upgrade, readable feature moments, and Barber polish"
  git push origin main
  Write-Host "V70 pushed to GitHub." -ForegroundColor Green
} else {
  Write-Host "No changes to commit." -ForegroundColor Yellow
}
