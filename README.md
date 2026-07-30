# Beard Laws Casino — Gold Master Art Pass v1.2

This is a presentation-only milestone built on Beard Engine 1.1.

## Protected systems

This release does **not** change:

- Feature pipeline order
- Weighted reel strips
- Payline evaluation
- Scatter evaluation
- Vernon's Favor payout rules
- Living Vault charge rules
- Vault Burst prize table
- Wallet deductions or payouts
- Save behavior

## Visual upgrades

### Living Vault

- Physical cabinet module forced above the reels
- Exact X / 30 charge text
- Animated gold-fill meter
- Shimmer and cabinet-feedback animation
- Runtime fallback creates the meter if an incomplete deployment leaves the old SEALED element

### Vaultmaster's Ledger

- Larger leather-bound book mounted to the right cabinet bezel
- Visible OPEN tab
- Runtime fallback restores the book if index.html and app.js are uploaded out of sync

### Reel matrix

- Taller cinematic 5×3 window
- Canvas renderer height increased
- Responsive height increased
- Layered animated glass reflection
- Linear texture filtering and shadow preparation for future painted PNG/WebP symbols

### Vernon presentation

When Vernon's Favor resolves:

- Cabinet dims
- Reel 3 receives a purple/gold glowing border pulse
- A short synthesized Vernon fanfare plays

### Audio and anticipation hooks

- Mechanical synthesized CLANG when Beard Coins add Living Vault charges
- Rising tension tones when the predetermined Reel 1–3 results contain coin/scatter feature potential
- Anticipation effects do not alter the result or math

## Cache verification

The lobby marquee visibly displays:

`GOLD MASTER ART PASS • v1.2`

If this label is missing after deployment, the browser or GitHub Pages is still serving an older file.

All CSS and scripts use `?v=1.2.0` cache-busting parameters.

After upload, use:

- Windows: Ctrl + F5
- Mac: Command + Shift + R
