Write-Host "Building Beard Laws Casino V67..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git add .
git commit -m "V67 - Modern reel engine and Frozen Happy Hour rebuild"
git push origin main
Write-Host "V67 pushed successfully." -ForegroundColor Green
