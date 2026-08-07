# Project Beard Milestone 5 — Big Bad Barber Vertical Slice

Milestone 5 proves the Project Beard architecture on one complete playable cabinet.

## What moved onto Project Beard

Big Bad Barber now uses the shared architecture end-to-end for paid and free spins:

1. Project Beard M4 reel engine spins and lands the result.
2. Barber evaluates the landed grid once.
3. `resolveBarberRuntime()` deterministically decides Builder upgrades, Shave Down, or Barber attack.
4. `createBarberSpinOutcome()` creates the cabinet-authored shared `SpinOutcome`.
5. `createBarberFeaturePlan()` converts that outcome into the shared M3 execution language.
6. `FeatureExecutionPipeline` runs persistence, feature animation, and payout in order.
7. `GameStateMachine` publishes the runtime lifecycle.
8. The completed outcome is handed to Application/replay/telemetry through `casino:direct-outcome`.
9. Auto Spin does not continue until the complete plan has finished.

## Important behavior preserved

- Same production symbol weights and pay evaluation.
- Same 48% Barber attack chance on eligible paid spins.
- Barber attacks remain guaranteed on eligible failed Shave Down free spins.
- Same fortress levels and stored multipliers.
- Same three-Razor / eight-free-spin Shave Down trigger.
- Same wallet/activity/progression accounting.
- Existing cabinet art and M4 Barber reel profile stay in place.

## QA

Force Shave Down and Force Barber Attack now also travel through the shared FeatureExecutionPipeline instead of bypassing it.

## Tests

`BarberRuntime.test.ts` verifies exact Builder-to-reel upgrades, bonus precedence, deterministic Barber targeting, and feature-plan order.

`SpinOutcomeStore.test.ts` now verifies cabinet-authored outcomes can become the diagnostic source of truth.

## Definition of done

- Typecheck passes.
- Full test suite passes.
- Production build passes.
- Normal Barber spin works.
- Auto Spin waits for Builder/Barber/bonus presentation.
- QA Barber bonus and attack work.
- Replay export contains a Barber outcome whose metadata runtime is `project-beard-m5`.
