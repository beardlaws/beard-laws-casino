# Beard Laws Casino V36

V36 builds directly on the restored V32/V35 source and preserves Supabase accounts, cloud wallets, guest mode, tribute artwork, roulette timing, and Beard Bank math.

## Beard Bank portrait-mobile rebuild

- The landscape cabinet is no longer reduced to a tiny postcard on portrait phones.
- Cabinet art, vault energy, reels, controls, and navigation now live on separate responsive layers.
- Reels occupy the phone width and receive extra vertical space.
- Wager, credit, win, auto, and spin controls are docked beneath the reels at touch-friendly size.
- Lobby and paytable controls stay at the top of the portrait composition.
- Landscape and desktop layout remain unchanged.

## Megh's interactive Intergalactic Encore

- 3, 4, or 5 UFOs now award 8, 12, or 16 base free drops.
- The player chooses one of three bonus modes:
  - Long Set: four additional free drops.
  - Power Chords: the persistent multiplier begins at 3x.
  - UFO Storm: UFO frequency increases during the feature for more retrigger chances.
- Winning cascades charge a visible amplifier meter.
- The venue progresses through Garage, Arena, Cosmic Stadium, and Galactic Headliner.
- Each stage upgrade raises the persistent multiplier.
- Retriggers award 3, 4, or 5 extra drops according to UFO count.
- Guitar Smash remains the player-picked finale.
- Rules and paytable text now explain the complete feature.

## Safety and verification

- The publishing script refuses to run without `.env` so a disconnected cloud build cannot be published accidentally.
- TypeScript, all 16 automated tests, the million-spin Beard Bank regression, and the production build pass.
