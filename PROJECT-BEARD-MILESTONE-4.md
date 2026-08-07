# Project Beard — Milestone 4: Unified Reel Engine

## Goal
Put every active DOM slot cabinet on one reel-motion contract while preserving a distinct cabinet personality through named motion profiles.

## What changed
- Added `ReelMotionProfile` presets: `premium`, `barber`, `voyage`, `cascade`, `bonus`.
- Shared reel engine now resolves and validates profiles in one place.
- Beard Bank uses `premium`; Vernon/free-spin motion uses `bonus`.
- Big Bad Barber uses the heavier `barber` profile.
- Neema uses `voyage` in paid play and `bonus` during free play.
- Megh uses `cascade`, with `bonus` for Encore/free drops and a targeted stagger override for Reel Rush.
- Shared runtime reel events expose spin start, phase changes, anticipation, reel stops, and spin completion for future Dev Suite/audio/timeline integration.
- Canonical reel CSS owns motion blur, lock flash, and settle presentation instead of adding another version-number stylesheet.

## Definition of done
- `npm run typecheck` passes.
- `npm test` passes.
- `npm run build` passes.
- Barber, Beard Bank, Neema, and Megh all spin top-to-bottom without blank frames.
- Existing math and feature rules are unchanged.

## Important
M4 standardizes the active DOM cabinets. The older Pixi `ReelSet` remains a legacy rendering path and is not migrated in this milestone because the live Beard Bank cabinet is currently `BeardBankDOM`.
