$ErrorActionPreference = "Stop"

Write-Host "" 
Write-Host "BEARD LAWS CASINO V68 - VERIFIED REELS DEPLOY" -ForegroundColor Cyan
Write-Host "Installing dependencies..." -ForegroundColor DarkCyan

npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed." }

Write-Host "Building production game..." -ForegroundColor DarkCyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Production build failed. Nothing was pushed." }

if (-not (Test-Path "dist/index.html")) {
  throw "Build completed without dist/index.html. Nothing was pushed."
}

Write-Host "Replacing GitHub Pages docs folder..." -ForegroundColor DarkCyan
if (Test-Path "docs") { Remove-Item "docs" -Recurse -Force }
Copy-Item "dist" "docs" -Recurse

# A visible deployment fingerprint makes it easy to prove GitHub Pages received V68.
"V68 VERIFIED REELS - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Set-Content "docs/VERSION.txt"

Write-Host "Staging source and built website..." -ForegroundColor DarkCyan
git add -A
git add -f docs

$changes = git status --porcelain
if (-not $changes) {
  Write-Host "Nothing new to commit. The working tree is already current." -ForegroundColor Yellow
  exit 0
}

Write-Host "Committing V68..." -ForegroundColor DarkCyan
git commit -m "V68 - Verified modern reels, clean chocolate milk, and Happy Hour polish"
if ($LASTEXITCODE -ne 0) { throw "Git commit failed." }

Write-Host "Pushing to GitHub..." -ForegroundColor DarkCyan
git push origin main
if ($LASTEXITCODE -ne 0) { throw "Git push failed." }

Write-Host "" 
Write-Host "V68 pushed. GitHub Pages now has the newly built docs folder." -ForegroundColor Green
Write-Host "After Pages finishes deploying, hard refresh with CTRL+F5." -ForegroundColor Green
