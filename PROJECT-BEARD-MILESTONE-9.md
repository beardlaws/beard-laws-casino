# Project Beard Milestone 9 — Production Math Reality Pass

Purpose: bring Barber, Megh, and Neema out of prototype payout territory and into a realistic casino-simulator target band while preserving their identities.

## Barber
- Golden Razor weight increased slightly so Shave Down is a real, reachable feature rather than a once-in-forever event.
- Builder and Wild weights reduced.
- Ordinary 243-way wins now require 4+ reels instead of 3+.
- Base payout scale reduced.
- Paid-spin Barber attack chance reduced from 48% to 14%.
- Fortress multipliers stay visually exciting, but the stored award uses a separate production payout scale.
- QA adds **Force 3 Razors Next Spin**, which uses the normal spin/result path instead of directly launching the feature.

Design target from engineering simulation: roughly 95% total RTP, high volatility, Shave Down around 1 in 160–180 paid spins. Browser Production Rule Lab is the source of truth after installation.

## Megh
- Soundcheck guarantee moved from 50 to 100.
- Filling three persistent channels no longer auto-fires Encore; the five-channel board remains the Headliner chase.
- Base cascade scale reduced modestly.
- Feature-only payout scale added so Encore can remain spectacular without paying hundreds of percent RTP.
- UFO sits closer to its target, scans longer, and uses a shorter beam tail.

Design target from engineering simulation: roughly 95–96% total RTP with base play carrying most of the return and Encore remaining meaningful.

## Neema
- Departure guarantee moved to 110.
- Cruise Ticket weight reduced slightly.
- Base line scale nudged upward while voyage/Happy Hour awards receive a dedicated feature payout scale.
- This preserves an active base game while bringing the long voyage economy back into a realistic total-return band.

Design target from engineering simulation: roughly 95–96% total RTP.

## Important
These are simulator targets for a fictional entertainment game, not regulatory certification. Run the Production Rule Lab after installing M9 and use the million-spin run before calling the math locked.
