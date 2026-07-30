# Beard Bank Math Report — Version 0.4 Alpha

## Purpose

This is the first math-first model for Beard Bank. It is intentionally separate from final art and animation so the outcome engine can be tested before presentation is polished.

## Regulatory-Inspired Principles

- Every spin is independent.
- The random outcome is selected before animation.
- The visual reels only reveal the selected stops.
- Player balance, previous results and session losses do not alter probabilities.
- No pity bonuses or dynamic difficulty.
- No artificially inserted near misses.
- Reel stops are selected from fixed virtual reel strips.
- The mathematical configuration is versioned and auditable.

## Current Model

- Layout: 5 reels × 3 rows
- Fixed paylines: 10
- Feature: six or more COIN symbols anywhere
- Wild substitutes for line-pay symbols
- BLANK and COIN symbols do not create normal line wins
- Bonus values are expressed as multiples of total bet

## One-Million-Spin Simulation

- Spins: 1,000,000
- Simulated RTP: 88.772%
- Winning-spin frequency: 5.272%
- Losing-spin frequency: 94.728%
- Bonus frequency: approximately 1 in 45.1 spins
- Average bonus return: 39.01× bet
- Standard deviation: 6.337
- Largest observed return: 144.00× bet

## Important Status

This is an alpha math model, not the final target. The target for the flagship Beard Bank machine is:

- RTP: approximately 94%–95%
- Hit frequency: approximately 25%–32%
- Medium-high volatility
- Bonus frequency: approximately 1 in 120–200 spins
- Meaningful losing streaks
- Maximum win: eventually capped and documented

The simulation tells us whether the current reel strips and paytable meet those targets. We tune the strips and paytable mathematically rather than secretly changing outcomes during play.
