# Project Beard Milestone 2 — Shared Outcome Engine

## Goal
Create one stable spin-result contract that replay, QA, telemetry, progression, and future production math can share.

## Included
- `SpinOutcome` v1 contract.
- `SpinOutcomeStore` that derives outcomes from the existing production activity/state stream.
- Automatic outcome attachment to replay exports.
- `casino:outcome` event for future QA, graphs, achievements, and cabinet health tools.
- Automated tests for outcome creation, forced completion, and replay embedding.

## Deliberate scope
This milestone does not rewrite cabinet math or alter payouts. It creates the migration bridge. Future cabinet extractions can populate result grids, seeds, base/feature splits, and metadata directly while all consumers keep the same contract.
