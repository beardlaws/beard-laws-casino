# Architecture Decisions

## 1. Engine independence

The engine imports no PixiJS, CSS, HTML, or browser UI elements.

It accepts typed requests and returns typed results.

## 2. Rendering independence

`ReelStripView` receives a completed grid. It cannot modify the result.

Presentation effects therefore cannot change the math.

## 3. Store ownership

`AppStore` owns UI state such as:

- spinning
- ledger visibility
- user-facing messages

`BeardEngine` owns game state such as:

- wallet
- spins
- wagers
- returns
- Living Vault charges

## 4. Fail loudly

The entry point validates every required mount point.

Initialization failures render a visible error panel instead of leaving a frozen but apparently loaded page.

## 5. Transparent pipeline

The Phase 1 order is:

1. 243-Ways evaluation
2. Scatter evaluation
3. Vernon's Favor
4. Living Vault charges
5. Ledger and state synchronization

## 6. Future modules

Planned modules can be added without rewriting the engine:

- WildMultiplierFeature
- HoldAndSpinFeature
- GridExpansionFeature
- VaultBurstFeature
- AchievementService
- PersistenceAdapter
- AudioDirector
- AssetManifest
