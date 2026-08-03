# Beard Laws Casino V28

## The reel-art correction

The premium square Beard Bank symbols were correctly loaded, but normal win-state cleanup reset their fitted Pixi scale to 1. That enlarged the transparent source art far beyond the reel window, so players saw transparent corners as blank symbols. V28 preserves the fitted scale through normal, dimmed, and winning states.

## Changes

- Removed every visible Living Vault `/30` counter, including the dormant legacy cabinet path.
- Kept Living Vault progress private while retaining non-numeric cabinet animation.
- Corrected premium Beard Bank symbol fit and win-pulse scaling.
- Added a photo-referenced cosmic Megh character portrait.
- Added premium feature marquees and control polish to Neema and Megh.
- Updated the visible Beard Bank badge and QA report to V28.
- Rebuilt the GitHub Pages `docs` output.

## Verification

- TypeScript build passed.
- 16 of 16 automated tests passed.
- All Beard Bank, Neema, and Megh art is emitted in the production bundle.
