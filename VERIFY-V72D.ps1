$ErrorActionPreference = "Stop"
$checks = @(
  "src/v72d-neema-showcase.css",
  "src/games/NeemasHighSeas.ts",
  "src/games/MeghsCosmicJam.ts",
  "src/games/BigBadBarber.ts",
  "V72D-RELEASE-NOTES.md"
)
foreach ($file in $checks) {
  if (-not (Test-Path $file)) { throw "Missing required V72D file: $file" }
  Write-Host "OK  $file" -ForegroundColor Green
}
$main = Get-Content "src/main.ts" -Raw
if ($main -notmatch "v72d-neema-showcase.css") { throw "V72D CSS is not imported by src/main.ts" }
$neema = Get-Content "src/games/NeemasHighSeas.ts" -Raw
$megh = Get-Content "src/games/MeghsCosmicJam.ts" -Raw
if ($neema -notmatch "neema-feature" -or $neema -notmatch "showCaptainMoment") { throw "Neema V72D wiring missing" }
if ($megh -notmatch "animateCascadeGravity" -or $megh -notmatch "megh-ufo") { throw "Megh V72D wiring missing" }
Write-Host "V72D source verification passed." -ForegroundColor Cyan
