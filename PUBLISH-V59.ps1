$ErrorActionPreference = "Stop"
if (-not (Test-Path ".env")) { throw "Missing .env. Keep your connected Supabase .env file before publishing V59." }
npm install
npm test -- --run
npm run build
if (Test-Path "docs") { Remove-Item "docs" -Recurse -Force }
Copy-Item "dist" "docs" -Recurse
New-Item "docs/.nojekyll" -ItemType File -Force | Out-Null
Write-Host "V59 production files are ready in /docs." -ForegroundColor Green
Write-Host "Next: git add -A; git commit -m 'Publish V59 casino authenticity'; git push origin main"
