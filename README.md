# Beard Laws Casino 2.1 — Gold Master Cabinet

This direct GitHub Pages package rebuilds the Beard Bank presentation around an original tall-cabinet hierarchy:

1. Jackpot top box
2. Living Vault feature deck
3. Large 5×3 reels
4. Casino-style control console

## Research-led engineering decisions

- PixiJS 8 `Assets.load()` for all textures
- Independent reel containers
- Per-reel BlurFilter
- Acceleration, cruise, deceleration, staggered stopping, and recoil
- Web Audio begins only after a player gesture
- Reduced Motion control plus automatic `prefers-reduced-motion` support
- Branch-root GitHub Pages deployment remains supported

## Original design

The package does not reproduce the supplied commercial game's characters, names, wheel segments, symbols, or branding.

Its original signature presentation is:

- Beard Bank jackpot top box
- Thirty-lock Living Vault door
- Beard Laws purple, gold, and green cabinet
- Vaultmaster Vernon collector rule
- Original Beard Laws symbol art

## Upload

Extract the ZIP and upload all contents to the repository root.

GitHub Pages:

`Deploy from a branch → main → /(root)`

Overwrite matching files. The repository does not need to be deleted again.
