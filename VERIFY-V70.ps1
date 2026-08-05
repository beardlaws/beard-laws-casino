$ErrorActionPreference = "Stop"
$required = @(
  ".\src\games\BigBadBarber.ts",
  ".\src\games\MeghsCosmicJam.ts",
  ".\src\v69-feature-moments.css",
  ".\src\v70-experience.css",
  ".\src\big-bad-barber.css",
  ".\PUBLISH-V70.ps1",
  ".\V70-RELEASE-NOTES.md"
)
$missing = $required | Where-Object { -not (Test-Path $_) }
if ($missing.Count -gt 0) {
  Write-Host "V70 package verification FAILED." -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "Missing: $_" -ForegroundColor Red }
  exit 1
}
$main = Get-Content .\src\main.ts -Raw
$app = Get-Content .\src\app\Application.ts -Raw
$megh = Get-Content .\src\games\MeghsCosmicJam.ts -Raw
if ($main -notmatch 'v70-experience.css' -or $main -notmatch 'big-bad-barber.css') { throw "V70 CSS imports are missing from src/main.ts" }
if ($app -notmatch 'BigBadBarber') { throw "Big Bad Barber is not wired into Application.ts" }
if ($megh -notmatch 'GOAT STAMPEDE' -or $megh -notmatch 'abducting') { throw "Goat/UFO feature code is missing" }
Write-Host "V70 package verified: Goat Stampede, UFO abduction, Big Bad Barber, and experience CSS are present." -ForegroundColor Green
