# V59 Casino Authenticity

## Beard Bank mobile rebuild

- Removes the duplicate Pixi title, vault halo, jackpot strip, chase labels and internal meter from portrait play.
- Expands the portrait reel surface from 632 x 606 to 652 x 900 internal pixels.
- Keeps navigation, title, feature chase and Vault Pressure in the crisp browser-native layer.
- Uses a compact control deck beneath the reels instead of shrinking a full desktop cabinet into the phone.

## Bonus integrity

- Megh's Encore has a hard 100-drop maximum and a 40-drop retrigger budget.
- Neema's Voyage has a hard 60-spin maximum and six-retrigger maximum.
- Both automatic features show current spin/drop, awarded total and remaining count.
- Megh's bonus ends with a summary for drops, retriggers, multiplier, cascade win, Guitar Smash and total.
- Win celebrations are based on bet multiples: Nice 2x, Big 5x, Mega 10x, Epic 25x, Colossal 50x, Intergalactic 100x.

## Verified Beard Bank math

One million deterministic spins with seed 0x0bead123:

- Total RTP: 96.4194%
- Base RTP: 66.9330%
- Hit frequency: 27.4722%
- Profitable-spin frequency: 18.7080%
- Vault Heist frequency: 1 in 83.08 spins
- Vernon Free Spins frequency: 1 in 119.95 spins
- Living Vault frequency: 1 in 110.40 spins
- Longest losing streak in sample: 44 spins
- Maximum total win in sample: 533.57x

Megh and Neema currently retain UI-owned random generation. Their feature ceilings are enforced and testable, but their exact all-in RTP is not labeled certified until they move into the shared deterministic engine.
