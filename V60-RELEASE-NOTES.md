# Beard Laws Casino V60 — Rebuilt Bank & Social Floor

## Beard Bank rebuilt

- Removed the Pixi/canvas cabinet from the production Beard Bank route.
- New responsive DOM/CSS 5×3 reel machine uses the verified production reel strips and 243-ways evaluator.
- Reels occupy the main phone viewport; no nested cabinet, giant empty panel, or shrunken image.
- Physical Living Vault, coin-charge animation, reel landing bounce, winning-symbol highlights, and persistent controls.
- Automatic Vault Heist, Vernon Free Spins, and Living Vault finale.
- Crypto-backed centralized random source replaces direct `Math.random()` usage in all three slots and creates the injection point required for seeded simulation.

## Social casino foundation

- Public Beard Board ranked by wager-normalized biggest multiplier.
- Public Casino Cards expose display name, level, plays, features, achievements, favorite game, and best multiplier.
- Emails, account IDs, wallets, and private profile JSON are never shown.
- Aggregate progress now records total wagered, total won, biggest multiplier, spins, bonuses, achievements, and per-game play.
- `supabase-setup-v60.sql` creates the protected public-stat table, read-only leaderboard view, RLS, and controlled publish function.

## Honest integrity boundary

The V60 function blocks backward and obviously impossible aggregate jumps and prevents direct table writes. Browser-owned games cannot be called cryptographically cheat-proof. A future server-outcome receipt service is required for adversarial public competition. Family rankings are safe for normal use; tournament prizes should remain fictional/cosmetic until server outcomes exist.

Beard Bank remains the only slot with a verified million-spin all-in report (96.42% in V59). Megh and Neema now share a centralized random seam and bonus safety limits, but their complete all-in RTP is not labeled certified until dedicated headless math models reproduce every base and feature rule.

## Database setup

Run `supabase-setup-v60.sql` once in the existing Supabase project's SQL Editor, then publish the site. Existing accounts begin appearing after their next saved activity.
