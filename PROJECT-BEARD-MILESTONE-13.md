# Project Beard Milestone 13 — Release Candidate Five-Fix Pass

This milestone completes the five priorities requested after the M10–12 Casino Night release.

## 1. Big Bad Barber trigger verification
- Three Golden Razors on a paid spin remain a guaranteed Shave Down trigger.
- QA `Force 3 Razors Next Spin` now reports a green verification message only after the paid-spin evaluator counts all three and the runtime schedules Shave Down.
- Unit coverage proves the trigger still wins precedence even if Builders and a base win land on the same spin.

## 2. Shave Down feature spectacle
- 8 free spins with a dedicated bonus HUD and running bonus total.
- Builders remain active during free spins.
- Failed free spins can still summon the Barber.
- New Final Trim: every fortress surviving the eighth free spin is shaved and reveals its stored multiplier award.
- Final Trim math uses a separate 0.03 production scale so the cinematic finale does not destroy RTP.

The build/reveal rhythm is an original Beard Laws mechanic. It is inspired by the tension and persistent-build appeal of modern feature slots, not a reproduction of any commercial game's exact rules or art.

## 3. Beard Laws Bank / Cashier redesign
- Proper account cards for Checking, Savings, Casino Wallet and Tickets.
- Tonight's visit summary and corrected net trip-result calculation.
- Lifetime passport statistics.
- Readable ticket cards and recent-visit rows.
- Full-size cashier destination buttons instead of raw browser-looking controls.
- Empty wallet no longer creates a meaningless zero-dollar casino visit from the cashier screen.

## 4. Production math lock
Engineering targets remain 95–96% for the flagship slots.
- Barber retains its M9 base/feature tuning and adds Final Trim at a calibrated 0.03 fortress-award scale.
- Megh remains at the already-in-range production rules from M9.
- Neema feature scale moves from 0.25 to 0.275 to bring the M9 92.90% report toward the target band.
- The production simulator now includes Barber Final Trim using the same pure finale resolver as live gameplay.
- The Production Rule Lab is labeled Project Beard M13.

The browser's 1,000,000-spin run remains the release gate. These are engineering simulations, not regulatory certification.

## 5. Megh final UFO readability pass
- Longer target lock.
- Shorter beam cap.
- Scan-ring highlight on the exact target.
- Less flashlight-tail look.
- Slightly longer beat after each abduction.

## Release gate
On Windows run:
1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. QA: Big Bad Barber → Force 3 Razors Next Spin
5. Production Rule Lab → Run 1,000,000 Each
6. Play one full Shave Down through Final Trim
7. Test Bank → ATM → play → Cashier → ticket → redeem

Do not deploy to `main/docs` until all seven pass.
