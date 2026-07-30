# Beard Laws Casino v0.2

Version 0.2 is the first reusable casino-engine build.

## What Changed

- All financial values now use integer cents to prevent floating-point money errors.
- Existing Version 0.1 browser balances migrate automatically.
- Reusable casino and roulette engine modules.
- Persistent trip history.
- Fictional bank activity ledger.
- Custom casino cash from $20–$500.
- Undo, repeat and double bet controls.
- Roulette column bets.
- $1 minimum and $500 maximum per spin.
- Rejection-sampling secure random selection.
- Settings and confirmed reset.
- Browser payout test page.

## Upload to GitHub

Upload every file and folder in this package to the repository root and allow GitHub to replace the older files.

Required root structure:

```text
index.html
styles.css
assets/
docs/
js/
tests/
```

The old root-level `app.js` is no longer used and may be deleted after Version 0.2 is working.

## Test Page

After deployment, open:

```text
https://beardlaws.github.io/beard-laws-casino/tests/roulette-tests.html
```

All payout tests should pass.

## Current Saving

Version 0.2 still uses browser localStorage. Firebase Authentication and Firestore are the next milestone.
