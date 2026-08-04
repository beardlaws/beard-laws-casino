$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  throw "Missing .env. Keep your connected Supabase .env file in the casino folder before publishing V37."
}

npm.cmd install
npm.cmd run build

if (Test-Path ".\docs") {
  Remove-Item -Recurse -Force ".\docs"
}

New-Item -ItemType Directory ".\docs" | Out-Null
Copy-Item -Recurse -Force ".\dist\*" ".\docs\"

Write-Host "V37 production files are ready in /docs." -ForegroundColor Green
Write-Host "Next: git add -A; git commit -m 'Publish V37 flagship mobile standard'; git push origin main"
