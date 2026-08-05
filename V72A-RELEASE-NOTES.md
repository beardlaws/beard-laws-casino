# Beard Laws Casino V72A — Engine Foundation

## Shared reel engine
- Replaced the legacy DOM reel implementation with one reusable ReelEngine.
- Reel strips now travel top-to-bottom.
- Settled results remain beneath the temporary motion layer, preventing black flashes.
- Shared acceleration, cruise, deceleration, anticipation, settle, and exact-stop phases.
- Reel phase and stop callbacks are available for future sound and cabinet-light cues.

## Shared presentation systems
- FeatureTimeline for readable, cancellable feature sequencing.
- CharacterLayer permanently above reels and below modal UI.
- CabinetEffects for shared impact and lighting pulses.
- FeatureDirector now exposes the shared timeline, character layer, cabinet impacts, particles, and count-ups.
- SlotControlPanel markup added for gradual migration to one consistent control layout.

## CSS boundary
- V72A is loaded last and owns the shared engine layers.
- Reduced-motion support included.
- Existing games keep their current markup while inheriting the new reel engine immediately.

## Scope
This is the engine milestone only. Barber feature progression, Megh character choreography, and Neema feature expansion belong to V72B–D and now have stable shared systems to build on.
