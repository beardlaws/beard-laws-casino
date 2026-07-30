# Beard Laws Casino — Beard Engine 1.3: Multi-Ways & Screen Thrill

## New engine modules

### Toggleable 243-Ways evaluation

The player can toggle between:

- 243 Ways
- Legacy 20 Lines

In 243-Ways mode, a symbol pays when it appears on adjacent reels from left to right, regardless of row.

The evaluator calculates a weighted number of ways for each paying symbol and normalizes the award against 243 total ways.

### Multiplier Wilds

Vaultmaster Vernon acts as the Wild symbol.

When Vernon appears on Reels 2, 3 or 4, that position receives:

- 2× with 62% probability
- 3× with 28% probability
- 5× with 10% probability

During Ways evaluation, a multiplier wild contributes its multiplier as the matching count on that reel. Multipliers therefore combine multiplicatively across adjacent reels.

The exact multiplier badges are drawn over the landed Vernon symbols and remain visible for the resolved spin.

### Screen Thrill

When the predetermined first three reels contain at least two coin/scatter-potential symbols:

- The PixiJS stage performs a subtle viewport zoom
- Reels 4 and 5 remain visually emphasized
- The cabinet receives a short lighting pulse

This is presentation only and cannot change the outcome.

### Cabinet impact

The full cabinet shakes when:

- A visible Beard Coin is worth at least 10× the current bet, or
- Vernon's Favor triggers

### Expansion state controller

The PixiJS renderer can rebuild dynamically as:

- 5×3
- 5×4
- 5×5

The Vaultmaster's Ledger includes preview controls for this framework.

The preview expands the state, renderer, symbol rows and responsive reel-window height. It does not independently award a prize. Future machines can call `window.BeardReels.setRows(rows, grid)` from a defined feature trigger.

## Transparent math warning

The former 94.20% target was created before:

- 243-Ways evaluation
- Wild multipliers
- Variable grid heights

It is retained only as a legacy design target. It is not the current verified RTP.

A new simulator must model:

- Both evaluation modes
- Every multiplier assignment
- Vernon collection
- Living Vault charges and burst awards
- Hold & Spin
- Each supported grid height

before a new RTP can be published.
