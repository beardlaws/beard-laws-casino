$ErrorActionPreference = "Stop"
$required = @(
  "src/graphics/CasinoAudio.ts",
  "src/engine/animation/ReelEngine.ts",
  "src/v75-audio-moments.css",
  "V75-RELEASE-NOTES.md",
  "PUBLISH-V75.ps1"
)
foreach ($file in $required) { if (-not (Test-Path $file)) { throw "Missing V75 file: $file" } }
$audio = Get-Content "src/graphics/CasinoAudio.ts" -Raw
if ($audio -notmatch "MASTER|setVolume|anticipation|clippers|frozen") { throw "V75 audio engine verification failed." }
$reels = Get-Content "src/engine/animation/ReelEngine.ts" -Raw
if ($reels -notmatch 'casino:sound') { throw "Reel sound hooks missing." }
Write-Host "V75 verification passed." -ForegroundColor Green
