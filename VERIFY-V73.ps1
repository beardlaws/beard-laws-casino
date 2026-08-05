$ErrorActionPreference = "Stop"
$required = @(
  "src/state/CasinoProgression.ts",
  "src/app/Application.ts",
  "src/v73-casino-evolution.css",
  "V73-RELEASE-NOTES.md"
)
foreach ($file in $required) { if (!(Test-Path $file)) { throw "Missing $file" } }
$progress = Get-Content "src/state/CasinoProgression.ts" -Raw
$app = Get-Content "src/app/Application.ts" -Raw
if ($progress -notmatch "beardChips") { throw "Beard Chips not wired" }
if ($app -notmatch "showBeardVault") { throw "Beard Vault not wired" }
if ($app -notmatch "CASINO TEST LAB • V73") { throw "V73 QA Lab not wired" }
Write-Host "V73 source verification passed." -ForegroundColor Green
