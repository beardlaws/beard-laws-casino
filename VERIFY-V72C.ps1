$ErrorActionPreference = "Stop"
Write-Host "Checking V72C Megh showcase files..." -ForegroundColor Cyan
$required = @(
  "src/games/MeghsCosmicJam.ts",
  "src/v72c-megh-showcase.css",
  "src/engine/animation/CharacterLayer.ts",
  "src/engine/FeatureDirector.ts",
  "assets/megh/goat.png",
  "assets/megh/ufo.png",
  "PUBLISH-V72C.ps1"
)
foreach ($file in $required) {
  if (-not (Test-Path $file)) { throw "Missing required file: $file" }
  Write-Host "OK $file" -ForegroundColor Green
}
$source = Get-Content "src/games/MeghsCosmicJam.ts" -Raw
foreach ($marker in @("megh-goat-actor", "abducting-readable", "event-replacement-v72c", "director.characters.move")) {
  if (-not $source.Contains($marker)) { throw "Missing V72C marker: $marker" }
}
Write-Host "V72C source markers verified." -ForegroundColor Green
