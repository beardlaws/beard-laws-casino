# Project Beard Milestone 8 — Feel Like Vegas

M8 is the premium "juice" pass built on top of M7. It does not change production math or add new payout mechanics.

## Shared animation engine
- Adds PremiumAnimationEngine for spotlighting, cabinet impact, cabinet pulse, shared animation cues, and reusable count-ups.
- Animation cues are visible in the Project Beard QA panel.

## Megh improvements
- UFO is constrained inside the reel viewport.
- UFO flies continuously inside board-local coordinates.
- UFO hover point follows the exact target tile while remaining inside the board.
- Beam width and length are derived from the real tile bounds.
- The actual tile rises into the beam; no visual clone is created.
- Feature spotlight dims non-target symbols and boosts active targets.
- Gravity uses stronger per-column staggering and a shared landing impact.
- Board settle emits a shared cue and cabinet pulse.
- Win count-up uses the shared premium animation engine.
- Large wins emit a shared big-win cue for future audio/light systems.
- Subtle idle cabinet breathing is added and respects reduced-motion preferences.

## Developer visibility
- Local source builds identify themselves as PROJECT-BEARD-M8-DEV.
- QA now displays the most recent shared animation cue.

## Deliberately unchanged
- Reel/math probabilities.
- Feature frequency.
- Payout values.
- Existing Encore rules.
