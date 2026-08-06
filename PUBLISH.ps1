param(
  [string]$Version = "PROJECT-BEARD-M1",
  [string]$CommitMessage = "Publish Project Beard Dev Suite Milestone 1",
  [switch]$SkipInstall,
  [switch]$NoPush
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-Checked {
  param([string]$Label, [scriptblock]$Command)
  Write-Host "`n==> $Label" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE. Nothing was published."
  }
}

function Git-Text([string[]]$Arguments) {
  return (& git @Arguments 2>$null | Out-String).Trim()
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Test-Path ".git")) { throw "Run PUBLISH.ps1 from the Git repository root." }
if (-not (Test-Path "package.json")) { throw "package.json is missing." }

$Branch = Git-Text @("branch", "--show-current")
$Commit = Git-Text @("rev-parse", "--short", "HEAD")
$BuiltAt = (Get-Date).ToUniversalTime().ToString("o")

$env:VITE_BUILD_VERSION = $Version
$env:VITE_BUILD_COMMIT = $Commit
$env:VITE_BUILD_BRANCH = $Branch
$env:VITE_BUILD_TIME = $BuiltAt
$env:VITE_MATH_MODE = "production-rules"

if (-not $SkipInstall) {
  if (Test-Path "package-lock.json") { Invoke-Checked "Install locked dependencies" { npm ci } }
  else { Invoke-Checked "Install dependencies" { npm install } }
}
Invoke-Checked "Project audit" { npm run casino:audit }
Invoke-Checked "Type check" { npm run typecheck }
Invoke-Checked "Automated tests" { npm test }
Invoke-Checked "Production build" { npm run build }

if (-not (Test-Path ".\dist\index.html")) { throw "Build completed without dist/index.html." }
if (Test-Path ".\docs") { Remove-Item ".\docs" -Recurse -Force }
New-Item -ItemType Directory -Path ".\docs" | Out-Null
Copy-Item ".\dist\*" ".\docs" -Recurse -Force

$Fingerprint = @"
BEARD LAWS CASINO $Version
Commit $Commit
Branch $Branch
Built $BuiltAt
Math production-rules
"@
Set-Content ".\docs\VERSION.txt" $Fingerprint -Encoding UTF8

$BundleFiles = Get-ChildItem ".\docs\assets\*.js"
if (-not $BundleFiles) { throw "No compiled JavaScript bundle found in docs/assets." }
$BundleHasVersion = $BundleFiles | Select-String ([regex]::Escape($Version)) -Quiet
if (-not $BundleHasVersion) { throw "Compiled bundle does not contain version fingerprint '$Version'." }
if ((Get-Content ".\docs\VERSION.txt" -Raw) -notmatch [regex]::Escape($Version)) { throw "VERSION.txt verification failed." }

Write-Host "`nVerified deployment fingerprint:" -ForegroundColor Green
Get-Content ".\docs\VERSION.txt"

Invoke-Checked "Stage release" { git add -A }
$HasChanges = -not [string]::IsNullOrWhiteSpace((Git-Text @("status", "--porcelain")))
if ($HasChanges) {
  Invoke-Checked "Commit release" { git commit -m $CommitMessage }
} else {
  Write-Host "No changed files to commit." -ForegroundColor Yellow
}

if (-not $NoPush) { Invoke-Checked "Push $Branch" { git push origin $Branch } }
$ResultWord = if ($NoPush) { "prepared" } else { "pushed" }
Write-Host "`nSUCCESS: $Version built, verified, and $ResultWord." -ForegroundColor Green
