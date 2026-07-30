# Beard Laws Casino 2.0 — Phase 1

This repository is the clean-slate replacement for the frozen vanilla JavaScript prototype.

## Stack

- Vite
- TypeScript in strict mode
- PixiJS 8
- Modular engine core
- Typed application store
- Vitest
- GitHub Actions deployment to GitHub Pages

## Architecture

```text
src/
├── engine/
│   ├── BeardEngine.ts
│   ├── FeaturePipeline.ts
│   ├── RNG.ts
│   ├── ReelEvaluator.ts
│   └── Wallet.ts
├── graphics/
│   ├── CabinetRenderer.ts
│   └── ReelStripView.ts
├── games/
│   └── BeardBank/
│       └── BeardBankConfig.ts
├── state/
│   └── AppStore.ts
├── types/
│   └── GameTypes.ts
├── ui/
│   └── AppShell.ts
└── index.ts
```

## Phase 1 behavior

The first build includes a working vertical slice:

- Clickable Spin button
- Crypto-secure random source
- Weighted Beard Bank reel strips
- Pure 243-Ways evaluator
- Typed feature pipeline
- Vernon's Favor collector rule
- Deterministic Living Vault charges
- Fictional wallet deductions and awards
- PixiJS reel presentation
- Live typed state synchronization
- Slide-out Game Integrity ledger
- Visible startup error screen if initialization fails

The first automatic spin during startup is temporary seed behavior for Phase 1 and verifies the complete engine-to-renderer connection.

## Local development

```bash
npm install
npm run dev
```

Typecheck:

```bash
npm run typecheck
```

Tests:

```bash
npm test
```

Production build:

```bash
npm run build
```

## GitHub Pages

The Vite base path is currently:

```ts
base: '/beard-laws-casino/'
```

This matches the existing repository URL:

```text
https://beardlaws.github.io/beard-laws-casino/
```

The included GitHub Actions workflow builds and deploys `dist/`.

In the repository settings, set **Pages → Source** to **GitHub Actions**.

## Math status

The legacy 94.20% number is retained only as a design reference. It is not a verified Engine 2.0 RTP.

No final RTP should be published until the full v2 feature pipeline is simulated at scale.

## Product boundary

Beard Laws Casino is a fictional entertainment simulator.

- No deposits
- No purchases
- No prizes
- No withdrawals
- No transfers
- No redeemable credits
