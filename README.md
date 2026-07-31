# Project Gold Beard — Phase 1, Step 2

A clean Vite + strict TypeScript + PixiJS-ready architecture for Beard Laws
Casino.

## Implemented engine modules

- atomic integer credit accounting
- immutable `WalletManager`
- typed deterministic `FeaturePipeline`
- injectable `RandomSource`
- browser `CryptoRandomSource`
- universal `GameConfig`
- weighted virtual `ReelGenerator`
- adjacent left-to-right `WaysEvaluator`
- typed `SpinCoordinator`
- initial `BeardBankConfig`
- deterministic tests
- valid Vite browser entry point

## Money convention

`100` credit units equals `1.00` displayed fictional casino credit.

Examples:

- `25` = `0.25`
- `100` = `1.00`
- `500` = `5.00`

Never pass decimal currency values into the engine.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

## GitHub Pages

Vite is configured with:

```ts
base: '/beard-laws-casino/'
```

The source project belongs in the repository. GitHub Actions should install,
test, build, and deploy the generated `dist/` directory.

## Important limitation

The current Beard Bank reel strips and payout values are development fixtures.
They have not been certified against the 94.20% design target. A simulation
harness and math report are required before the game math is locked.
