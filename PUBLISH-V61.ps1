$ErrorActionPreference = "Stop"
npm install
npm run build
if (Test-Path docs) { Remove-Item docs -Recurse -Force }
Copy-Item dist docs -Recurse
Write-Host "V61 built into docs. Review, then git add -A, commit, and push." -ForegroundColor Green
