$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  throw "Missing .env. Keep your connected Supabase .env file in the casino folder before publishing V38."
}

npm.cmd install
npm.cmd run build

if (-not (Test-Path "docs")) {
  New-Item -ItemType Directory -Path "docs" | Out-Null
}

Remove-Item -Recurse -Force ".\docs\*" -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force ".\dist\*" ".\docs\"

Write-Host "V38 production files are ready in /docs." -ForegroundColor Green
Write-Host "Next: git add -A; git commit -m 'Publish V38 compact mobile Beard Bank'; git push origin main"
