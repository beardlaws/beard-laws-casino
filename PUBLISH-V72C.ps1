$ErrorActionPreference = 'Stop'
Write-Host 'Building Beard Laws Casino V72C...' -ForegroundColor Cyan
npm install
npm run build
if (-not (Test-Path 'dist/index.html')) { throw 'Build did not create dist/index.html' }
if (Test-Path 'docs') { Remove-Item 'docs' -Recurse -Force }
Copy-Item 'dist' 'docs' -Recurse
"V72C MEGH COSMIC JAM SHOWCASE`nBuilt: $(Get-Date -Format o)" | Set-Content 'docs/VERSION.txt'
git add -A
git add -f docs
$changes = git status --porcelain
if ($changes) { git commit -m 'Publish V72C Megh Cosmic Jam showcase' } else { Write-Host 'Nothing new to commit.' -ForegroundColor Yellow }
git push origin main
Write-Host 'V72C pushed. Wait for GitHub Pages, then Ctrl+F5.' -ForegroundColor Green
