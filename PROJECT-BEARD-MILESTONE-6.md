# Project Beard Milestone 6 — Megh Authoritative Cascade Runtime

Goal: make every visible Megh board transition come from one authoritative board resolution.

## Included
- per-column gravity runtime with exact source rows
- goat/UFO target intents become true removals instead of instant replacements
- visible hole beat before gravity
- survivors fall first, replacements spawn above the board, then settle
- UFO actor/beam use one cabinet-local coordinate system and dynamic beam height
- longer post-event and Auto settle beats
- canonical `styles/megh-runtime.css` loaded after legacy compatibility styles
- tests proving duplicate symbols in other columns cannot corrupt gravity origins

No payout tuning is included in M6. Production math is a separate milestone after runtime behavior is verified.
