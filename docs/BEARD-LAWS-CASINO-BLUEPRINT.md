# Beard Laws Casino — Design Blueprint v1.0

## 1. Product Vision

Beard Laws Casino is a free, browser-based casino-trip simulator built around realistic fictional bankroll management, authentic casino pacing, original bearded characters, and transparent game mathematics.

The player does not receive billions of meaningless credits. They begin with a believable fictional bank balance, choose how much cash to bring into the casino, pay ATM fees when withdrawing more, and return any remaining casino cash to their fictional bank when leaving.

All balances are fictional. Nothing can be purchased, transferred, redeemed, sold, or exchanged for money, prizes, property, services, or anything else of value.

## 2. Design Pillars

### Authenticity
The game should feel like entering a real regional casino with $100–$300, not opening a mobile casino app.

### Transparency
The player can always see:
- Casino wallet
- Fictional bank balance
- Current trip result
- ATM withdrawals and fees
- Total wagered
- Session length
- Lifetime win/loss

### Originality
The project may be inspired by broad slot genres and casino experiences, but it must not copy branded games, exact art, characters, sound effects, reel layouts, bonus names, or proprietary presentations.

### No Manipulation
- No purchasable currency
- No fake urgency
- No streak-adjusted odds
- No secret difficulty changes
- No forced losses
- No deceptive “big win” celebration for a net-losing spin
- No advertisements
- No daily reward traps

### Personality
The casino is filled with original bearded humans, animals, dealers, and mascots. The humor is occasional and dry, not constant cartoon chaos.

## 3. Audience and Access

Initial access:
- Personal use
- Approved Google accounts only
- Desktop and mobile browsers
- Installable as a Progressive Web App later

Future access:
- Friends and family accounts
- Separate fictional bank and statistics per account

Public release is not part of Version 1.

## 4. Legal/Operational Boundaries

Permanent product restrictions:
- No real-money deposits
- No real-money withdrawals
- No chip purchases
- No cryptocurrency
- No gift cards
- No prizes
- No sweepstakes currency
- No player-to-player transfers
- No paid memberships that provide credits
- No sponsored contests tied to results
- No merchandise redemption

Required disclaimer:

> Beard Laws Casino is a free entertainment simulator. All balances, wagers, winnings, bank funds, and credits are fictional and have no monetary value. Nothing can be purchased, transferred, redeemed, withdrawn, or exchanged for money, property, prizes, services, or anything else of value.

## 5. Core Player Loop

1. Sign in.
2. View fictional Beard Laws Bank balance.
3. Start a casino visit.
4. Choose $100, $150, $200, $300, or custom trip cash.
5. Move that amount from the fictional bank into the casino wallet.
6. Enter the casino lobby.
7. Choose a game.
8. Play with realistic denominations and pacing.
9. Optionally visit the ATM and pay a fictional fee.
10. Visit the cashier to end the trip.
11. Return remaining casino cash to the fictional bank.
12. Save a detailed trip report.

## 6. Fictional Economy

### Default Starting Bank
$2,000.00

### Trip Cash Options
- $100
- $150
- $200
- $300
- Custom: $20–$500

### ATM
- Withdrawals: $100, $200, $300, $500
- Fee: $7.99 per transaction
- Maximum withdrawals per trip: 3
- ATM funds come from the fictional bank
- ATM fees do not enter the casino wallet

### Cashier
- Ends the active visit
- Returns casino wallet to fictional bank
- Saves trip history
- Displays net result including ATM fees

### Reset
- Located in Settings
- Requires typing RESET
- Deletes current fictional finances and game history
- Optional future “New Season” reset preserves lifetime records

## 7. Casino Areas

### Main Lobby
- Current wallet and bank
- Active trip status
- Featured games
- ATM
- Cashier
- Player card
- Session statistics
- Settings

### Roulette Pit
- Beard Roulette
- Traditional American roulette
- Quiet, elegant presentation

### Featured Attraction
- Beard Drop
- Original free-fall video roulette presentation
- Same American roulette betting model
- Mechanical tower and bearded animal spectators

### Blackjack Pit
- Version 2
- Authentic six-deck blackjack

### Slot Hall
- Version 3+
- Original bearded slot machines

## 8. Game 1 — Beard Roulette

### Wheel
American roulette:
- 1–36
- 0
- 00

### Chips
- $1
- $5
- $10
- $25
- $100

### Supported Bets
Version 1:
- Straight-up
- Red/black
- Odd/even
- Low/high
- Dozens
- Columns

Version 1.1:
- Split
- Street
- Corner
- Six-line

### Payouts
- Straight-up: 35:1
- Red/black: 1:1
- Odd/even: 1:1
- Low/high: 1:1
- Dozen: 2:1
- Column: 2:1

Stake is returned in addition to winnings.

### Spin Modes
- Cinematic
- Normal
- Quick

### Randomness
Use `crypto.getRandomValues()` in supported browsers.

### Integrity
- Each spin is independent
- No bankroll-based manipulation
- No history-based manipulation
- Previous spins do not influence future spins

## 9. Game 2 — Beard Drop

Original video roulette game inspired by the broad free-fall roulette genre.

### Presentation
- Tall mechanical glass tower
- Ball released from the top
- Pegs, rails, rotating beard-comb obstacles
- Ball lands in a numbered chamber
- Dramatic camera and sound presentation
- Winning number selected fairly before animation
- Animation resolves to the selected result

### Characters
- The Bearded Bear
- The Bearded Moose
- The Bearded Bison
- The Bearded Eagle
- Walter Whiskers, host
- Bruno Beardwell, pit announcer

### Important Rule
Beard Drop uses the same American roulette probabilities and payouts as Beard Roulette. The presentation changes; the math does not.

## 10. Blackjack — Version 2

Recommended rules:
- Six-deck shoe
- Dealer stands on soft 17
- Blackjack pays 3:2
- Double on any first two cards
- Double after split
- Split up to three hands
- Split aces receive one card
- Bets from $5–$100 initially

Tables:
- Side Room: $5–$100
- Main Floor: $10–$250
- High Limit Beard: $25–$1,000

## 11. Slot Hall — Version 3+

The slot machines must capture familiar genres without copying branded games.

### Lumber Beard
Genre:
- Expanding reels
- Building/growth mechanic
- Medium volatility

Original mechanic:
- Axes remove wooden reel borders
- Reel area expands
- Cabins upgrade into lodges
- Bearded lumberjack wild

### Great Beard Migration
Genre:
- Animal collection
- Multipliers
- High volatility

Original mechanic:
- Collect bearded wilderness animals
- Each animal charges a different multiplier
- Full migration triggers a feature

### Beard Bank
Genre:
- Hold-and-spin coin collection
- Growing persistent values
- Low-to-medium volatility

Original mechanic:
- Golden beard coins lock
- Vault jars grow
- Coins upgrade through grooming tiers
- Full board unlocks Legendary Beard Vault

### Coin Groomer
Genre:
- Coins become larger or more valuable

Original mechanic:
- Coins progress from stubble to legendary beard
- Each growth stage increases value
- Comb symbols upgrade neighboring coins

## 12. Slot Mathematics Standards

Every slot must document:
- Theoretical RTP
- Volatility
- Hit frequency
- Bonus frequency
- Maximum win
- Reel strips or weighted symbol tables
- Paytable
- Feature rules
- Simulation test results

Target range:
- RTP: 93%–96%
- No dynamic RTP
- No hidden player-specific odds
- No fake near-miss manipulation

## 13. Session Statistics

Per trip:
- Start time
- End time
- Starting cash
- ATM withdrawals
- ATM fees
- Ending cash
- Net result
- Total wagered
- Spins/hands played
- Biggest win
- Highest wallet
- Lowest wallet
- Time per game
- Favorite bet type
- Notes

Lifetime:
- Total visits
- Lifetime profit/loss
- Total ATM fees
- Best trip
- Worst trip
- Biggest roulette hit
- Biggest slot hit
- Longest session
- Total wagered
- Game-by-game performance

## 14. Player Progression

Progression is cosmetic only.

Beard Club tiers:
1. Fresh Face
2. Five O’Clock Shadow
3. Short Beard
4. Full Beard
5. Mountain Man
6. Legend

Unlocks may include:
- Chip styles
- Table felt
- Dealer outfits
- Casino music
- Lobby decorations
- Avatar beards
- Trophy room items

No progression reward changes odds.

## 15. Characters

### Walter Whiskers
Old-school roulette dealer. Calm and understated.

### Bruno Beardwell
Featured-game announcer. More theatrical, used sparingly.

### The Bearded Bear
Silent slot-hall regular. Judges poor decisions with facial expressions.

### Lady Locks
Elegant blackjack dealer with braided fantasy beard styling.

### Timber Tom
Lumber Beard mascot.

### Vaultmaster Vernon
Beard Bank host.

## 16. Sound Direction

Separate controls:
- Master
- Music
- Casino ambience
- Dealer voice
- Game effects
- Win effects

Sound palette:
- Distant slot bells
- Chip clinks
- Roulette wheel
- Ball bounce
- Card shuffle
- Low crowd murmur
- Mechanical tower sounds
- Occasional distant celebration

Avoid:
- Constant jingles
- Repetitive voice lines
- Overly loud loss sounds
- Childlike mobile-game effects

## 17. Visual Direction

Style:
- Modern regional casino
- Dark wood
- Brushed metal
- Deep red felt
- Warm gold lighting
- Purple/blue neon accents
- Subtle smoke and glow
- Original bearded character art

Avoid:
- Childlike cartoon UI
- Excessive flashing
- Copying any casino brand
- Wall-to-wall beard jokes
- Tiny mobile controls

## 18. Technical Architecture

### Frontend
Initial prototype:
- HTML
- CSS
- JavaScript

Production:
- React
- TypeScript
- Vite
- Optional PixiJS for high-performance game animation

### Hosting
- GitHub Pages for static site
- Firebase Hosting is an alternative

### Cloud Services
- Firebase Authentication
- Cloud Firestore
- Optional Cloud Functions later

### Security
- Approved-account allowlist
- Firestore rules restricting data to authenticated owner
- No secrets stored in frontend beyond public Firebase configuration
- Administrative operations separated from player operations

## 19. Core Data Model

### User
- uid
- email
- displayName
- createdAt
- clubTier
- settings

### Financial Profile
- bankBalance
- walletBalance
- lifetimeNet
- lifetimeWagered
- totalAtmFees

### Active Trip
- tripId
- startedAt
- startingCash
- atmWithdrawals
- atmFees
- wallet
- totalWagered
- highestWallet
- lowestWallet
- gameStats

### Completed Trip
- all active trip fields
- endedAt
- endingCash
- netResult
- notes

### Roulette Spin
- spinId
- tripId
- gameMode
- bets
- totalBet
- result
- payout
- timestamp

## 20. Development Roadmap

### Milestone 0 — Blueprint
- Product rules
- Economy
- legal boundaries
- game definitions
- architecture

### Milestone 1 — Functional Prototype
- Fictional bank
- Start visit
- ATM
- Cashier
- Basic American roulette
- Browser storage
- Trip summary

### Milestone 2 — Cloud Foundation
- GitHub repository
- Firebase project
- Google sign-in
- Approved accounts
- Firestore saving
- Security rules

### Milestone 3 — Polished Beard Roulette
- Full betting board
- Proper wheel
- animations
- sounds
- mobile layout
- complete statistics

### Milestone 4 — Beard Drop
- Tower animation
- bearded characters
- presentation modes
- shared roulette engine

### Milestone 5 — Blackjack
- Card engine
- authentic rules
- dealer personalities
- shoe statistics

### Milestone 6 — First Slot
- Beard Bank recommended first
- documented math model
- simulation testing
- original assets
- feature animations

### Milestone 7 — Living Casino
- player card
- cosmetic progression
- NPC regulars
- casino news
- seasonal visual changes
- trophy room

## 21. Definition of Version 1 Complete

Version 1 is complete when:
- Approved user can sign in
- Fictional bank saves online
- User can begin a trip
- ATM fees work
- Cashier ends the trip correctly
- American roulette payouts are verified
- Beard Drop works with identical roulette math
- Session and lifetime statistics save
- Mobile and desktop are usable
- Disclaimer is visible
- No real-money mechanism exists
