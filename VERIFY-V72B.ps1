$ErrorActionPreference = 'Stop'
$required = @(
  'src/games/BigBadBarber.ts',
  'src/v72b-big-bad-barber.css',
  'src/engine/animation/ReelEngine.ts',
  'src/ui/SlotControlPanel.ts',
  'V72B-RELEASE-NOTES.md'
)
foreach ($file in $required) {
  if (-not (Test-Path $file)) { throw "Missing required V72B file: $file" }
  Write-Host "OK  $file" -ForegroundColor Green
}
$barber = Get-Content 'src/games/BigBadBarber.ts' -Raw
foreach ($token in @('applyBuilders','barberAttack','startShaveDown','data-barber-auto','BEARD BUILDER')) {
  if ($barber -notmatch $token) { throw "V72B wiring missing token: $token" }
}
$main = Get-Content 'src/main.ts' -Raw
if ($main -notmatch 'v72b-big-bad-barber.css') { throw 'V72B CSS is not imported in src/main.ts' }
Write-Host "`nV72B showcase source verified." -ForegroundColor Cyan
