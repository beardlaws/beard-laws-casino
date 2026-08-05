# V64 — Denominations, Free Play, and Math Integrity

## Casino wager model

- Adds 1¢, 2¢, 5¢, and 10¢ denominations to Beard Bank, Neema, and Megh.
- Separates denomination from credits wagered.
- Supports total slot wagers from $0.50 through $250.00.
- Denomination scales monetary value only; reel strips, feature odds, RTP, and multiplier distributions do not change.

## Math integrity

- Replaces Beard Bank's live Living Vault shortcut with the same outcome generator used by its simulator.
- Live and simulated Living Vault outcomes now share one source of truth.
- Keeps the rare 500× full-board award and makes high-value prize coins genuinely rare.
- Adds wager-cap and denomination-invariance regression tests.
- Neema's final Happy Hour spaces now become progressively harder to fill, reducing routine 500× Grand awards.

## Daily engagement

- Daily Beard Pass now awards claimable fictional Free Play.
- One claim is allowed per UTC day.
- Seven-day rewards progress from $2 to $10.
- Free Play adds to the casino wallet without changing game odds.
- Existing daily missions, achievements, Passport, and Beard Board remain active.

## Presentation

- Beard Bank base spins use more reel-travel frames.
- Neema base spins are longer with more deliberate staggered reel stops.
- Frozen Happy Hour uses a longer visible respin cycle.
- Large Beard Bank awards use longer count-ups and celebration holds.

## Verification

- TypeScript passed.
- Production build passed.
- 18/18 automated tests passed.
- All slot art packaged successfully.
