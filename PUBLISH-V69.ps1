$ErrorActionPreference = "Stop"
Write-Host "Building Beard Laws Casino V69..." -ForegroundColor Cyan
npm install
npm run build
if (Test-Path .\docs) { Remove-Item .\docs -Recurse -Force }
Copy-Item .\dist .\docs -Recurse
"V69 FEATURE MOMENTS + BIG BAD BARBER - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Set-Content .\docs\VERSION.txt
Write-Host "Production build copied to docs." -ForegroundColor Green
git add -A
git add -f docs
$changes = git status --porcelain
if ($changes) {
  git commit -m "V69 - Feature moments and Big Bad Barber"
  git push origin main
  Write-Host "V69 pushed to GitHub." -ForegroundColor Green
} else {
  Write-Host "No changes to commit." -ForegroundColor Yellow
}
