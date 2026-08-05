$ErrorActionPreference = "Stop"
$required = @(
  "src/engine/animation/ReelEngine.ts",
  "src/engine/animation/FeatureTimeline.ts",
  "src/engine/animation/CharacterLayer.ts",
  "src/engine/animation/CabinetEffects.ts",
  "src/ui/SlotControlPanel.ts",
  "src/v72a-engine-foundation.css",
  "V72A-RELEASE-NOTES.md",
  "PUBLISH-V72A.ps1"
)
foreach ($file in $required) {
  if (-not (Test-Path $file)) { throw "Missing V72A file: $file" }
  Write-Host "FOUND $file" -ForegroundColor Green
}
if (-not (Select-String -Path "src/main.ts" -Pattern "v72a-engine-foundation.css" -Quiet)) { throw "V72A CSS is not imported" }
if (-not (Select-String -Path "src/games/DomReelAnimator.ts" -Pattern "spinReelStrips" -Quiet)) { throw "Games are not wired to ReelEngine" }
Write-Host "V72A foundation wiring verified." -ForegroundColor Cyan
