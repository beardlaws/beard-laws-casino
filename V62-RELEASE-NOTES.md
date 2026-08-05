# Beard Laws Casino V62 — Player Identity & Mobile HUD

- Signed-in players can edit their public casino username from the profile window.
- Usernames are validated to 2–24 safe characters, saved locally and to Supabase, and republished to the Beard Board immediately.
- Password-reset email control added to the signed-in profile window.
- Megh's Cosmic Jam now permanently displays account balance, current/last win, and running bonus win on desktop and mobile.
- Megh's mobile 6×5 reel grid now uses zero-minimum columns, reinforced reel-cell backgrounds, and bounded artwork so narrow screens cannot create visually blank reel positions.
- No slot weights, pay calculations, feature odds, or Beard Bank math were changed.

Verification: TypeScript, production build, and all 16 automated tests passed.
