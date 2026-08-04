$ErrorActionPreference = "Stop"
if (-not (Test-Path ".env")) { throw "Missing .env. Keep your connected Supabase .env file before publishing V50." }
npm.cmd install
npm.cmd run test -- --testTimeout=30000
npm.cmd run build
if (-not (Test-Path "docs")) { New-Item -ItemType Directory -Path "docs" | Out-Null }
Remove-Item -Recurse -Force ".\docs\*" -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force ".\dist\*" ".\docs\"
Write-Host "V50 production files are ready in /docs." -ForegroundColor Green
Write-Host "Next: git add -A; git commit -m 'Publish V50 premium casino leap'; git push origin main"
