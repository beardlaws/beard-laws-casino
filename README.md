# Beard Laws Casino — Project Gold Beard v0.9 True Reels

This release fixes the v0.8 canvas reel movement defect.

## Fixed

The v0.8 controller repositioned individual symbol containers in a way that could appear as vibration or shaking rather than full reel travel.

v0.9 replaces that animation with a true row-position reel loop:

- Visible symbols travel through complete vertical rows
- Symbols wrap from below the window to above the window
- New passing symbols are assigned only when a symbol wraps
- Reels accelerate into full speed
- Reels cruise long enough for obvious vertical movement
- Reels stop one at a time
- Every reel continues through a real deceleration phase
- Final weighted outcomes are applied only at lock
- Each reel recoils and settles after stopping
- Resize rebuilding is disabled while a spin is running

## Cache note

The game scripts now include a `v=0.9.0` query string. This helps prevent GitHub Pages and the browser from continuing to use the older v0.8 reel controller.

After uploading, still perform a hard refresh:

- Windows: Ctrl + F5
- Mac: Command + Shift + R

## Files to replace

Upload the entire extracted package, or at minimum replace:

- `index.html`
- `pixi-reels.js`
- `README.md`

The existing fictional wallet, weighted outcome engine, payline logic, session statistics and Hold & Spin controller remain unchanged.
