# Beard Laws Casino 3.2 — Playable Concept Match

This milestone rebuilds the visual container to match the approved Project Gold Beard concept hierarchy while preserving the existing engine.

## Protected systems

No changes were made to:

- Crypto RNG
- Reel strips
- 243-Ways payout evaluator
- Paytable values
- Feature pipeline
- Living Vault charge logic
- Wallet deductions
- Wallet awards
- Session accounting

## Layered component architecture

### Cabinet frame

- Gold outer bezel
- Purple underglow
- Jackpot marquee
- Molded lower control deck

### Feature deck

- Framed Vaultmaster Vernon portrait
- Center Living Vault feature wheel
- Right-side thirty-lock progress panel

### Reel assembly

- Five independent PixiJS reels
- Chrome separators
- Left and right sequence markers
- Purple SVG win-path overlay
- Glass and LED layers

### Win drawer

Winning groups no longer block the main reels.

Each group creates a card containing:

- 3 / 4 / 5 OF A KIND
- Symbol title
- Number of ways
- Mini symbol strip
- Individual award

The total is tallied separately beneath the card stack.

## Asset binding preparation

`src/graphics/AssetManifest.js` looks for:

1. Transparent WebP
2. Transparent PNG
3. Existing SVG fallback

Drop future painted assets into:

`assets/symbols/`

Exact filenames:

- oil
- comb
- razor
- balm
- key
- crown
- coin
- vault
- vernon

No engine change is required when the painted files arrive.

## Deployment

Upload and overwrite the complete package at the repository root.

GitHub Pages:

`Deploy from a branch → main → /(root)`

Open after deployment:

`https://beardlaws.github.io/beard-laws-casino/?v=320`
