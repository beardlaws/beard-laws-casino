$ErrorActionPreference = "Stop"
Write-Host "Building Beard Laws Casino V77B..." -ForegroundColor Cyan
npm install
npm run casino:audit
npm run typecheck
npm test
node .\scripts\casino-release.mjs V77B-ACTUAL-MATH

git add -f docs
git add -A
$changes = git status --porcelain
if ($changes) {
  git commit -m "V77B - Actual production math integration"
  git push origin main
} else {
  Write-Host "Nothing changed; no commit created." -ForegroundColor Yellow
}
Write-Host "V77B published." -ForegroundColor Green
