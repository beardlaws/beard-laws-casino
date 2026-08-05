# Beard Laws Casino V70 - Experience Upgrade

## Megh's Cosmic Jam
- In-grid Goat Stampede with three visible goats crossing at staggered heights.
- Strawberry-first tile targeting with CHOMP highlighting.
- Only selected tiles are removed and replaced.
- UFO positioning uses the actual target-cell coordinates.
- Target symbols rise, shrink, and disappear into the beam one at a time.
- Replacement symbols visibly drop into only the changed positions.
- Heavy fullscreen fog and blur are disabled during these feature moments.

## The Big Bad Barber
- New playable 5x3, 243-ways feature slot.
- Golden Razors trigger The Shave Down.
- Persistent beard fortresses upgrade through larger reward tiers.
- Modern staggered reel animation using the shared DOM reel animator.
- Added cabinet life, gold dust, scissors motion, and result-settle timing.

## Deployment
- PUBLISH-V70.ps1 builds the game, replaces docs, writes a V70 fingerprint,
  force-stages docs, commits, and pushes.
- VERIFY-V70.ps1 confirms that the V70 feature files and application wiring
  are present before publishing.
