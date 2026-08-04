$ErrorActionPreference = "Stop"
if (-not (Test-Path ".env")) { throw "Missing .env. Keep your connected Supabase .env file before publishing V57." }
npm install
npm test -- --run
npm run build
if (Test-Path "docs") { Remove-Item "docs" -Recurse -Force }
Copy-Item "dist" "docs" -Recurse
New-Item "docs/.nojekyll" -ItemType File -Force | Out-Null
Write-Host "V57 production files are ready in /docs." -ForegroundColor Green
Write-Host "Next: git add -A; git commit -m 'Publish V57 automatic bonus floor'; git push origin main"
