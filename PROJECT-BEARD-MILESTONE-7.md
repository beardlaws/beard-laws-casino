# Project Beard Milestone 7 — Premium Animation Engine

Goal: make Megh's feature actions readable, board-local, and reusable as the reference animation runtime for future Project Beard cabinets.

## Included
- Board-local character layer for UFO and goat actors
- UFO, beam, particles, and target tiles share one coordinate system
- Legacy UFO/goat full-board overlays removed from live feature presentation
- UFO travels continuously target-to-target instead of teleporting
- Target lock anticipation pause before every abduction
- Symbol visibly rises into the beam before removal
- Goat travels, looks, sniffs, chomps, and exits before gravity starts
- Feature spotlight dims non-target symbols without hiding the board
- Physics-style cascade timing based on fall distance
- Independent per-column symbol falls with landing compression/bounce/settle
- Visible empty-hole beat before gravity
- Longer free-drop handoff so the settled board remains readable
- Shared `casino:animation` cues for future sound/dev-suite integrations
- Canonical `styles/megh-premium-animation.css` loads after legacy CSS
- Unit test for fall-duration scaling

## Deliberately not included
- Payout/RTP tuning. Current production-rule math remains a separate milestone.
- New gameplay features. M7 is presentation/runtime only.

## Test focus
1. Force Goat Stampede: goat must enter the board, visit exact target(s), eat, exit, then gravity resolves.
2. Force UFO Scan: UFO must remain attached to the board, stop above exact target(s), beam must align, tile rises, then gravity resolves.
3. Watch cascades: existing symbols fall first; only missing cells spawn from above; each column settles independently.
4. Run Encore Auto: final board should hold visibly before the next free drop starts.
