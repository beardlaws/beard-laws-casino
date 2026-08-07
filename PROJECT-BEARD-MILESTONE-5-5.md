# Project Beard Milestone 5.5 — Barber Cabinet Polish + Megh Runway

## Goal
Make Big Bad Barber feel materially more alive without changing production math, while laying the exact-target feature command foundation for Megh's M6 runtime migration.

## Big Bad Barber polish
- Builder Foreman visibly travels from the reel area to the fortress row.
- Builder hammer sequence and cabinet impacts make upgrades readable.
- Fortress row gets lit windows, chimney smoke, flags, construction flashes, and level-specific life.
- Two-Razor anticipation visibly highlights the important final reel without covering the board.
- Barber attacks get an explicit target lock, danger lighting, randomized taunts, reward particles, and animated win count-up.
- Winning symbols get a cleaner lift/glow treatment.
- Spin button receives tactile feedback.
- New canonical `src/styles/barber.css` loads after historical layers instead of adding another version-number CSS file.
- QA Lab gains **Force Builder Upgrade** so the new sequence can be tested instantly.

## Megh runway (no live gameplay change yet)
`MeghFeatureIntent.ts` introduces normalized exact-tile commands for:
- goat-eat
- ufo-abduct
- goat personality identity

Targets are unique, in bounds, and preserve order. M6 will convert these intents into shared Feature Pipeline plans so Goat/UFO actions cannot drift from the authoritative board.

## Math
No Barber symbol weights, pays, attack chance, fortress multipliers, bonus trigger, or wager rules are changed in M5.5.

## Verification
Run:
1. `npm run typecheck`
2. `npm test`
3. `npm run build`

Manual Barber checks:
- QA → Force Builder Upgrade
- QA → Two-Razor Near Miss
- QA → Force Barber Attack
- Auto Spin for several spins
- Normal paying win

Only commit when all checks are green.
