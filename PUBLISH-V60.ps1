$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $project
npm install
npm test
npm run build
if (Test-Path docs) { Remove-Item docs -Recurse -Force }
Copy-Item dist docs -Recurse
New-Item docs/.nojekyll -ItemType File -Force | Out-Null
Write-Host "V60 built into docs. Run supabase-setup-v60.sql once, then commit and push."
