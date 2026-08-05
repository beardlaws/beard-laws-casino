$ErrorActionPreference = "Stop"
$required = @(
  "src/engine/GameStateMachine.ts",
  "src/state/CasinoTelemetry.ts",
  "src/app/Application.ts",
  "src/games/MeghsCosmicJam.ts",
  "src/v74-master-stabilization.css",
  "V74-RELEASE-NOTES.md"
)
foreach ($file in $required) { if (!(Test-Path $file)) { throw "Missing $file" } }
$app = Get-Content "src/app/Application.ts" -Raw
$megh = Get-Content "src/games/MeghsCosmicJam.ts" -Raw
$main = Get-Content "src/main.ts" -Raw
if ($app -notmatch "CASINO TEST LAB • V74") { throw "V74 QA Lab is not wired" }
if ($app -notmatch "CLOSE AFTER TRIGGER") { throw "Persistent QA controls missing" }
if ($app -notmatch "FAMILY TROPHY ROOM") { throw "Trophy Room missing" }
if ($app -notmatch "CasinoTelemetryStore") { throw "Telemetry not wired" }
if ($megh -notmatch "event-replacement-v74") { throw "Megh replacement stabilization missing" }
if ($main -notmatch "v74-master-stabilization.css") { throw "V74 CSS not imported" }
Write-Host "V74 source verification passed." -ForegroundColor Green
