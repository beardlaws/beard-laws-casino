$ErrorActionPreference = "Stop"
npm install
npm test
npm run build
if (Test-Path docs) { Remove-Item docs -Recurse -Force }
Copy-Item dist docs -Recurse
Write-Host "V65 built and tested into docs. Review, then git add -A, commit, and push." -ForegroundColor Green
