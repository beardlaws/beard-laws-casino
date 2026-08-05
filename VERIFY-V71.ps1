$ErrorActionPreference = "Stop"
$checks = @(
  @{ Path = ".\src\engine\FeatureDirector.ts"; Pattern = "class FeatureDirector"; Name = "Shared Feature Director" },
  @{ Path = ".\src\games\DomReelAnimator.ts"; Pattern = "dom-reel-motion-layer"; Name = "Non-destructive reel layer" },
  @{ Path = ".\src\games\MeghsCosmicJam.ts"; Pattern = "goat-running-in"; Name = "Target-driven goat sequence" },
  @{ Path = ".\src\games\MeghsCosmicJam.ts"; Pattern = "beam-firing"; Name = "Target-tracking UFO" },
  @{ Path = ".\src\v71-casino-systems.css"; Pattern = "Big Bad Barber cabinet elevation"; Name = "V71 cabinet graphics" },
  @{ Path = ".\src\main.ts"; Pattern = "v71-casino-systems.css"; Name = "V71 CSS wiring" }
)
$failed = $false
foreach ($check in $checks) {
  if ((Test-Path $check.Path) -and (Select-String -Path $check.Path -Pattern $check.Pattern -Quiet)) {
    Write-Host "PASS: $($check.Name)" -ForegroundColor Green
  } else {
    Write-Host "FAIL: $($check.Name)" -ForegroundColor Red
    $failed = $true
  }
}
if ($failed) { throw "V71 verification failed." }
Write-Host "V71 source package verified." -ForegroundColor Cyan
