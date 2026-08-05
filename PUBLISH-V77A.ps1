$ErrorActionPreference = "Stop"
Write-Host "Building Beard Laws Casino V77A..." -ForegroundColor Cyan
npm install
npm run casino:audit
npm run typecheck
npm test
node .\scripts\casino-release.mjs V77A-PROJECT-BEARD

git add -f docs
git add -A
$changes = git status --porcelain
if ($changes) {
  git commit -m "V77A - Project Beard foundation"
  git push origin main
} else {
  Write-Host "Nothing changed; no commit created." -ForegroundColor Yellow
}
Write-Host "V77A published." -ForegroundColor Green
