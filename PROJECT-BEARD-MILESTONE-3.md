# Project Beard Milestone 3 — Shared Feature Pipeline

## Goal
Create one serial, cancellable execution queue for cabinet features, progression,
payout, and presentation steps.

## Included
- Shared feature execution contracts
- Serial feature plan queue
- SpinOutcome-to-feature-plan adapter
- Replay diagnostics for pipeline plans and steps
- Application observer integration
- Automated planner and queue tests

## Safety
M3 is observer-only. Existing cabinet animations, payouts, and math remain in
place. The shared pipeline records the execution language first; future
milestones migrate Goat, UFO, Barber, and Neema moments onto handlers one at a
time.
