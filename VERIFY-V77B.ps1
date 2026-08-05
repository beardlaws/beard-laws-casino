$ErrorActionPreference = "Stop"
$checks = @(
  "src/state/ProductionCasinoSimulation.ts",
  "src/games/BigBadBarber.ts",
  "src/games/MeghsCosmicJam.ts",
  "src/games/NeemasHighSeas.ts",
  "src/app/Application.ts",
  "PUBLISH-V77B.ps1",
  "V77B-RELEASE-NOTES.md"
)
foreach ($file in $checks) { if (-not (Test-Path $file)) { throw "Missing V77B file: $file" } }
$barber = Get-Content "src/games/BigBadBarber.ts" -Raw
$megh = Get-Content "src/games/MeghsCosmicJam.ts" -Raw
$neema = Get-Content "src/games/NeemasHighSeas.ts" -Raw
$app = Get-Content "src/app/Application.ts" -Raw
$sim = Get-Content "src/state/ProductionCasinoSimulation.ts" -Raw
if ($barber -notmatch "BARBER_PRODUCTION_MATH") { throw "Barber production math is not exported." }
if ($megh -notmatch "MEGH_PRODUCTION_MATH") { throw "Megh production math is not exported." }
if ($neema -notmatch "NEEMA_PRODUCTION_MATH") { throw "Neema production math is not exported." }
if ($sim -notmatch "runProductionSimulation") { throw "Production simulation engine is missing." }
if ($app -notmatch "RUN ACTUAL CABINET MATH") { throw "Actual math QA button is not wired." }
if ($app -match "runModelSimulation") { throw "Legacy model simulation is still wired in Application.ts." }
Write-Host "V77B source verification passed." -ForegroundColor Green
Write-Host "Next: powershell -ExecutionPolicy Bypass -File .\PUBLISH-V77B.ps1" -ForegroundColor Cyan
