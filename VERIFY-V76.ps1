$ErrorActionPreference = "Stop"
$checks = @(
  "src/state/CasinoSimulationLab.ts",
  "src/state/CasinoProgression.ts",
  "src/state/CasinoTelemetry.ts",
  "src/app/Application.ts",
  "src/v76-truth-progression.css",
  "PUBLISH-V76.ps1",
  "V76-RELEASE-NOTES.md"
)
foreach ($file in $checks) { if (-not (Test-Path $file)) { throw "Missing V76 file: $file" } }
$app = Get-Content "src/app/Application.ts" -Raw
$progress = Get-Content "src/state/CasinoProgression.ts" -Raw
if ($app -notmatch "showCasinoMathReport") { throw "Casino math report is not wired." }
if ($app -notmatch "RUN CASINO MATH") { throw "QA math button is not wired." }
if ($progress -notmatch "mastery") { throw "Mastery progression is not wired." }
if ($progress -notmatch "discoveredEvents") { throw "Event discovery is not wired." }
Write-Host "V76 source verification passed." -ForegroundColor Green
Write-Host "Next: powershell -ExecutionPolicy Bypass -File .\PUBLISH-V76.ps1" -ForegroundColor Cyan
