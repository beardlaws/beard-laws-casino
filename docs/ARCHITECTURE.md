# Project Beard Architecture

## Canonical layers

### Engine
`src/engine` owns deterministic rules, wallet coordination, game states, reel motion, feature timing, character layers, and cabinet effects.

### Cabinet games
`src/games` owns game-specific math, symbols, feature rules, and presentation orchestration. Cabinet code must not recreate shared reel or timing engines.

### State and progression
`src/state` owns profiles, telemetry, simulation reports, mastery, Reputation, Beard Chips, and saved progress.

### UI
`src/ui` owns shared controls and app shell behavior.

### Styles
`src/styles/casino.css` is the only stylesheet imported by `main.ts`. New shared styling belongs in `src/styles`; game styling belongs in named cabinet files. New version-number CSS files are forbidden.

## Required game lifecycle
READY → SPIN_START → SPINNING → REEL_STOPS → EVALUATING → WIN_PRESENTATION / FEATURE_INTRO / CASCADE → READY

## Rules
- One authoritative board state per game.
- Visual animations never mutate math outcomes.
- QA forcing is isolated from production randomness.
- Cosmetic progression never changes RTP or odds.
- Every feature has telemetry and a QA trigger.
