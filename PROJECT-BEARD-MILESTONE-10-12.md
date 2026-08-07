# Project Beard Milestone 10-12 — Casino Night

This combined milestone intentionally ships three connected studio systems together.

## M10 — Casino Economy & Cashier

- Persistent fictional Beard Laws Bank checking and savings accounts.
- Casino wallet becomes visit/session money rather than the permanent bank balance.
- ATM withdrawals move money from checking to the casino wallet and charge a fictional $3.99 fee.
- Active casino visits track starting cash, ATM additions, fees, wagering, recorded wins, spins, features, biggest win, and favorite game.
- Cashier can cash the full wallet to checking, savings, or a fictional TITO-style ticket.
- Tickets can be printed through the browser and redeemed exactly once.
- Recent casino visit history is visible from Beard Laws Bank.
- Legacy player profiles normalize safely with a new economy state.
- All money is fictional entertainment credit and has no cash value.

## M11 — Audio Mixer & Atmosphere

- Master, Game Effects, and Casino Ambience volumes are independent and persistent.
- Lobby, Barber, Megh, Neema, Beard Bank, and table games have distinct synthesized ambient beds.
- ATM, cashier, bank, and ticket actions have their own audio cues.
- Existing feature cues continue through the effects bus.
- Animation events can trigger shared reel-stop and big-win audio hooks.

## M12 — Shared Premium Cabinet Polish

- Shared cabinet reaction lighting for cosmic, gold, and danger moments.
- Big / Major / Legendary win tiers.
- Shared cabinet impact and LED cues through PremiumAnimationEngine.
- Casino shell has subtle idle breathing with reduced-motion support.
- Existing cabinet-specific animation systems remain compatible.

## Verification

Run on Windows after applying:

1. `npm run typecheck`
2. `npm test`
3. `npm run build`

Then test the full economy loop locally before merging/publishing:

1. Open Beard Laws Bank.
2. Withdraw $200 from checking at the ATM.
3. Play at least one cabinet.
4. Open Cashier.
5. Print a ticket.
6. Open Beard Laws Bank and redeem it to checking or savings.
7. Confirm the same ticket cannot be redeemed twice.
8. Open Experience Settings and test Master, Effects, and Ambience sliders.
