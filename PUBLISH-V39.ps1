$ErrorActionPreference = "Stop"
if (-not (Test-Path ".env")) { throw "Missing .env. Keep your connected Supabase .env file before publishing V39." }
npm.cmd install
npm.cmd run test
npm.cmd run build
if (-not (Test-Path "docs")) { New-Item -ItemType Directory -Path "docs" | Out-Null }
Remove-Item -Recurse -Force ".\docs\*" -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force ".\dist\*" ".\docs\"
Write-Host "V39 production files are ready in /docs." -ForegroundColor Green
Write-Host "Next: git add -A; git commit -m 'Publish V39 living casino elevation'; git push origin main"
