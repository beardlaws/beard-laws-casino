# Beard Laws Casino v0.3 — Playable Casino Floor

Version 0.3 fixes the core usability issue: the lobby is now an actual clickable interface rather than concept artwork.

## Working Games

- Beard Roulette
- Black Beard Blackjack
- Beard Bank
- Lumber Beard

All four games share the same fictional casino wallet.

## Important

The concept image remains artwork only. The working game cards are now rendered below the live casino toolbar after starting a visit.

## Upload

Upload all files and folders from this package to the root of the GitHub repository and replace the existing files.

Root files:

```text
index.html
styles.css
app.js
assets/
docs/
```

You may delete the old `js/` and `tests/` folders after v0.3 is confirmed working because this release intentionally returns to a single-script build for reliability while the game systems are still changing rapidly.

## Test

1. Start a $200 visit.
2. Open every game from the lobby.
3. Play one roulette spin.
4. Play one blackjack hand.
5. Spin Beard Bank until the progress meter changes.
6. Spin Lumber Beard until an axe expands the reels.
7. Visit the ATM.
8. Cash out.
9. Confirm Trip History contains the completed visit.
