$ErrorActionPreference = "Stop"
Write-Host "Building Beard Laws Casino V71..." -ForegroundColor Cyan
npm install
npm run build
if (Test-Path .\docs) { Remove-Item .\docs -Recurse -Force }
Copy-Item .\dist .\docs -Recurse
"V71 FAMILY CASINO SYSTEMS - TARGETED GOATS, TRACKING UFO, NO BLACK REELS - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Set-Content .\docs\VERSION.txt
Write-Host "Production build copied to docs." -ForegroundColor Green
git add -A
git add -f docs
$changes = git status --porcelain
if ($changes) {
  git commit -m "V71 - Shared casino systems, targeted goats, tracking UFO, and Barber cabinet"
  git push origin main
  Write-Host "V71 pushed to GitHub." -ForegroundColor Green
} else {
  Write-Host "No changes to commit." -ForegroundColor Yellow
}
