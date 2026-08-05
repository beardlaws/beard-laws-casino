$ErrorActionPreference = 'Stop'
Write-Host 'Building Beard Laws Casino V72B...' -ForegroundColor Cyan
npm install
npm run build
if (-not (Test-Path 'dist/index.html')) { throw 'Build did not create dist/index.html' }
if (Test-Path 'docs') { Remove-Item 'docs' -Recurse -Force }
Copy-Item 'dist' 'docs' -Recurse
"V72B BIG BAD BARBER SHOWCASE`nBuilt: $(Get-Date -Format o)" | Set-Content 'docs/VERSION.txt'
git add -A
git add -f docs
$changes = git status --porcelain
if ($changes) { git commit -m 'Publish V72B Big Bad Barber showcase' } else { Write-Host 'Nothing new to commit.' -ForegroundColor Yellow }
git push origin main
Write-Host 'V72B pushed. Wait for GitHub Pages, then Ctrl+F5.' -ForegroundColor Green
