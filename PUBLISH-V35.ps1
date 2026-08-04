$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  throw "Missing .env. Keep the connected .env file from your working V33/V34 repository before publishing V35."
}

npm.cmd install
npm.cmd run build

if (Test-Path ".\docs") {
  Remove-Item -Recurse -Force ".\docs"
}

New-Item -ItemType Directory ".\docs" | Out-Null
Copy-Item -Recurse -Force ".\dist\*" ".\docs\"

Write-Host "V35 production files are ready in /docs." -ForegroundColor Green
Write-Host "Next: git add -A; git commit -m 'Publish V35 restored tribute casino'; git push origin main"
