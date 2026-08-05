# Beard Laws Casino V71 — Family Casino Systems Upgrade

## Shared reel presentation
- DOM reels now spin in a temporary motion layer above the settled board.
- Previous symbols remain behind the moving strips until the final grid is rendered.
- Removes the black/empty flash seen in The Big Bad Barber.
- Adds synchronized acceleration, cruise, deceleration, staggered stops, anticipation and reel-lock flashes.

## Shared Feature Director
- Reusable cabinet shake levels.
- Reusable particle bursts for crumbs, cosmic sparks and gold.
- Frame-based count-up support for future win presentations.

## Megh's Cosmic Jam
- Goat Stampede now uses the actual goat artwork.
- Every goat runs to a real target tile instead of crossing a fixed overlay path.
- Goats stop, sniff, chomp, create crumbs and run off screen.
- Removed the CHOMP word badge.
- Target tiles remain visible before they are eaten.
- UFO uses the actual UFO artwork.
- UFO moves to each target tile and fires the beam one tile at a time.
- Abduction and replacement timing slowed for readability.
- Board remains visible throughout the feature.

## The Big Bad Barber
- Black/empty reel gap removed by the shared motion layer.
- Heavier reel timing and stronger staggered stops.
- Final-reel anticipation when two early Golden Razors are visible.
- Added win particles and cabinet response.
- Cabinet upgraded with layered metallic trim, glass reflections, deeper reel wells, illuminated controls and stronger visual hierarchy.

## Deployment
- PUBLISH-V71.ps1 builds, replaces docs, writes VERSION.txt, force-stages docs, commits and pushes.
- Script stops before publishing if npm install or build fails.
