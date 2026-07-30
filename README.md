# Beard Laws Casino — Beard Engine 1.1 / Living Vault Milestone

This release preserves the working v0.9 PixiJS reel renderer and refactors the game logic into the published Beard Engine 1.1 feature pipeline.

## Published feature order

1. Payline evaluation
2. Scatter evaluation
3. Vernon's Favor
4. Living Vault charges
5. Ledger, museum and save update

## Living Vault

- Every visible Beard Coin adds exactly one charge
- Current progress is displayed above the reels
- Meter threshold is exactly 30 charges
- At 30 charges the meter resets to zero
- The Living Vault Burst overlay opens automatically
- The player chooses Gold Chest, Safe, Coin Stack or Treasure Shelf
- All four choices use the same transparent weighted prize table:
  - 50%: 5× total bet
  - 28%: 10× total bet
  - 15%: 20× total bet
  - 5.5%: 50× total bet
  - 1.5%: 100× total bet

## Vernon's Favor

- Vernon is present only on Reel 3's configured strip
- When Vernon is visible on Reel 3 and one or more Beard Coins are visible:
  - Every coin receives a defined value
  - The visible values are summed
  - That amount is added to the same spin win
  - Coins remain visible
- The event resolves after paylines and scatters

## Vaultmaster's Ledger

The leather book attached to the cabinet opens a slide-out drawer with:

- Current visit statistics
- Coins landed
- Vaults opened
- Vernon's Favor triggers
- Biggest win
- Target RTP
- Live session RTP
- Current Living Vault charges
- RNG source: crypto.getRandomValues()
- Lifetime Beard Museum badges

## Math status

The 94.20% figure remains a target, not a verified final RTP. Living Vault and Vernon's Favor materially alter the return model. The next math-lab simulation must include the complete feature pipeline and published Vault Burst prize distribution before the target can be considered audited.
