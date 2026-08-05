# Beard Laws Casino V68 - Verified Modern Reels

## What was actually corrected

- Replaced the multi-animation reel handoffs with one shared `requestAnimationFrame` loop.
- Every reel now advances in the same browser frame, while keeping its own stop time.
- Removed symbol-level shaking, blur, bounce, and legacy stop animations during reel motion.
- Final reel positions snap to exact pixels to prevent shimmer after landing.
- Neema keeps a longer premium spin with left-to-right stagger and ticket anticipation.
- Beard Bank uses the same stable modern reel foundation with heavier timing.
- Replaced the chocolate milk SVG itself. The words are no longer baked into the artwork.
- Enlarged the clean chocolate milk glass inside the symbol frame.
- Added stronger Frozen Happy Hour cabinet styling and clearer locked-drink presentation.

## Deployment correction

V67 built only into `dist`, which Git ignored, so GitHub Pages could remain on an older build.
`PUBLISH-V68.ps1` now:

1. installs dependencies;
2. performs the production build;
3. replaces `docs` with the new `dist` output;
4. writes `docs/VERSION.txt` as a deployment fingerprint;
5. explicitly stages `docs`;
6. commits and pushes only after the build succeeds.

## Publish

Open PowerShell inside the existing Git repository and run:

```powershell
.\PUBLISH-V68.ps1
```

After GitHub Pages finishes, use `Ctrl+F5` to bypass the browser cache.
