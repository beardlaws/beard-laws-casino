type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

interface Card { readonly rank: Rank; readonly suit: Suit; }
interface Hand {
  cards: Card[];
  betUnits: number;
  finished: boolean;
  doubled: boolean;
  splitAces: boolean;
  result?: string;
}

interface HandValue { readonly total: number; readonly soft: boolean; }

const SUITS: readonly Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: readonly Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export class PapasBlackjack {
  private shoe: Card[] = [];
  private dealer: Card[] = [];
  private hands: Hand[] = [];
  private activeHand = 0;
  private roundActive = false;
  private message = "Choose a chip and deal the cards.";
  private selectedBetUnits = 500;
  private lastReturnedUnits = 0;
  private lastProfitUnits = 0;
  private dealerResult: "win" | "bust" | "push" | "" = "";

  public constructor(
    private readonly root: HTMLElement,
    private readonly getWalletUnits: () => number,
    private readonly setWalletUnits: (units: number) => void,
    private readonly onExit: () => void,
  ) { this.shuffleShoe(); }

  public open(): void { this.render(); }

  private shuffleShoe(): void {
    this.shoe = [];
    for (let deck = 0; deck < 6; deck += 1) {
      for (const suit of SUITS) for (const rank of RANKS) this.shoe.push({ rank, suit });
    }
    for (let index = this.shoe.length - 1; index > 0; index -= 1) {
      const random = new Uint32Array(1);
      crypto.getRandomValues(random);
      const target = random[0]! % (index + 1);
      [this.shoe[index], this.shoe[target]] = [this.shoe[target]!, this.shoe[index]!];
    }
  }

  private draw(): Card {
    if (this.shoe.length < 52) this.shuffleShoe();
    return this.shoe.pop()!;
  }

  private value(cards: readonly Card[]): HandValue {
    let total = 0;
    let aces = 0;
    for (const card of cards) {
      if (card.rank === "A") { total += 11; aces += 1; }
      else if (["J", "Q", "K"].includes(card.rank)) total += 10;
      else total += Number(card.rank);
    }
    while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
    return { total, soft: aces > 0 };
  }

  private isNatural(hand: Hand): boolean {
    return hand.cards.length === 2 && this.value(hand.cards).total === 21 && this.hands.length === 1;
  }

  private deal(): void {
    if (this.roundActive || this.selectedBetUnits > this.getWalletUnits()) return;
    this.setWalletUnits(this.getWalletUnits() - this.selectedBetUnits);
    this.lastReturnedUnits = 0;
    this.lastProfitUnits = 0;
    this.dealerResult = "";
    this.hands = [{ cards: [this.draw(), this.draw()], betUnits: this.selectedBetUnits, finished: false, doubled: false, splitAces: false }];
    this.dealer = [this.draw(), this.draw()];
    this.activeHand = 0;
    this.roundActive = true;
    if (this.isNatural(this.hands[0]!) || this.value(this.dealer).total === 21) this.finishDealer();
    else this.message = "Your call, boss. Hit, stand, double, or split.";
    this.render();
  }

  private hit(): void {
    const hand = this.hands[this.activeHand];
    if (!this.canHit(hand)) return;
    if (!hand) return;
    hand.cards.push(this.draw());
    const total = this.value(hand.cards).total;
    if (total >= 21) { hand.finished = true; this.advance(); }
    else this.message = `Hand ${this.activeHand + 1}: ${total}. Hit or stand?`;
    this.render();
  }

  private stand(): void {
    const hand = this.hands[this.activeHand];
    if (!hand || hand.finished) return;
    hand.finished = true;
    this.advance();
    this.render();
  }

  private doubleDown(): void {
    const hand = this.hands[this.activeHand];
    if (!this.canDouble(hand)) return;
    if (!hand) return;
    this.setWalletUnits(this.getWalletUnits() - hand.betUnits);
    hand.betUnits *= 2;
    hand.doubled = true;
    hand.cards.push(this.draw());
    hand.finished = true;
    this.advance();
    this.render();
  }

  private split(): void {
    const hand = this.hands[this.activeHand];
    if (!this.canSplit(hand)) return;
    if (!hand) return;
    this.setWalletUnits(this.getWalletUnits() - hand.betUnits);
    const splitAces = hand.cards[0]!.rank === "A";
    const left: Hand = { cards: [hand.cards[0]!, this.draw()], betUnits: hand.betUnits, finished: splitAces, doubled: false, splitAces };
    const right: Hand = { cards: [hand.cards[1]!, this.draw()], betUnits: hand.betUnits, finished: splitAces, doubled: false, splitAces };
    this.hands.splice(this.activeHand, 1, left, right);
    this.message = splitAces ? "Split aces receive one card each." : `Playing hand ${this.activeHand + 1} of ${this.hands.length}.`;
    if (splitAces) this.advance();
    this.render();
  }

  private advance(): void {
    const next = this.hands.findIndex((hand, index) => index > this.activeHand && !hand.finished);
    if (next >= 0) { this.activeHand = next; this.message = `Playing hand ${next + 1} of ${this.hands.length}.`; }
    else this.finishDealer();
  }

  private finishDealer(): void {
    while (this.value(this.dealer).total < 17) this.dealer.push(this.draw());
    const dealerValue = this.value(this.dealer).total;
    const dealerNatural = this.dealer.length === 2 && dealerValue === 21;
    let returned = 0;
    let wins = 0;
    for (const hand of this.hands) {
      const playerValue = this.value(hand.cards).total;
      if (this.isNatural(hand) && !dealerNatural) { returned += Math.round(hand.betUnits * 2.5); hand.result = "BLACKJACK • PAYS 3:2"; wins += 1; }
      else if (dealerNatural && this.isNatural(hand)) { returned += hand.betUnits; hand.result = "PUSH"; }
      else if (playerValue > 21) hand.result = "BUST";
      else if (dealerValue > 21 || playerValue > dealerValue) { returned += hand.betUnits * 2; hand.result = "WIN"; wins += 1; }
      else if (playerValue === dealerValue) { returned += hand.betUnits; hand.result = "PUSH"; }
      else hand.result = "DEALER WINS";
      hand.finished = true;
    }
    this.setWalletUnits(this.getWalletUnits() + returned);
    const totalWagered = this.hands.reduce((sum, hand) => sum + hand.betUnits, 0);
    const pushes = this.hands.filter((hand) => hand.result === "PUSH").length;
    this.lastReturnedUnits = returned;
    this.lastProfitUnits = returned - totalWagered;
    this.dealerResult = dealerValue > 21 ? "bust" : wins === 0 && pushes === this.hands.length ? "push" : wins > 0 ? "" : "win";
    this.roundActive = false;
    this.message = dealerValue > 21 ? "Dealer busts. Papa raises the cold one." : wins > 0 ? `${wins} winning hand${wins === 1 ? "" : "s"}. Biggie and Vern approve.` : "Dealer takes it. The house hounds remain suspiciously calm.";
  }

  private canHit(hand?: Hand): boolean { return Boolean(this.roundActive && hand && !hand.finished && !hand.splitAces); }
  private canDouble(hand?: Hand): boolean { return Boolean(this.canHit(hand) && hand!.cards.length === 2 && this.getWalletUnits() >= hand!.betUnits); }
  private canSplit(hand?: Hand): boolean {
    if (!this.canHit(hand) || this.hands.length >= 3 || hand!.cards.length !== 2 || this.getWalletUnits() < hand!.betUnits) return false;
    const point = (rank: Rank): number => ["J", "Q", "K"].includes(rank) ? 10 : rank === "A" ? 11 : Number(rank);
    return point(hand!.cards[0]!.rank) === point(hand!.cards[1]!.rank);
  }

  private cardMarkup(card: Card, hidden = false): string {
    if (hidden) return `<b class="playing-card card-back" aria-label="Hidden dealer card"><span>P</span></b>`;
    const red = card.suit === "♥" || card.suit === "♦";
    return `<b class="playing-card ${red ? "red-card" : ""}"><span>${card.rank}</span><i>${card.suit}</i></b>`;
  }

  private handResultClass(hand: Hand): string {
    if (!hand.result) return "";
    if (hand.result === "WIN" || hand.result.startsWith("BLACKJACK")) return "hand-win";
    return hand.result === "PUSH" ? "hand-push" : "hand-loss";
  }

  private handPayoutMarkup(hand: Hand): string {
    if (!hand.result) return "";
    if (hand.result.startsWith("BLACKJACK")) return `<span class="hand-payout">RETURN ${this.money(Math.round(hand.betUnits * 2.5))}</span>`;
    if (hand.result === "WIN") return `<span class="hand-payout">RETURN ${this.money(hand.betUnits * 2)}</span>`;
    if (hand.result === "PUSH") return `<span class="hand-payout">BET RETURNED</span>`;
    return `<span class="hand-payout">NO RETURN</span>`;
  }

  private render(): void {
    const active = this.hands[this.activeHand];
    const hideHole = this.roundActive;
    const reaction = this.message.includes("Dealer takes") ? "papa-loss" : this.message.includes("winning hand") || this.message.includes("Dealer busts") ? "papa-win" : "papa-ready";
    const dealerCards = this.dealer.length ? this.dealer.map((card, index) => this.cardMarkup(card, hideHole && index === 1)).join("") : `<span class="empty-cards">WAITING FOR DEAL</span>`;
    this.root.innerHTML = `<section class="table-room papa-room ${reaction}">
      <div class="sports-lounge" aria-hidden="true"><div class="lounge-tv tv-blue">BIG BLUE<br><b>4TH & 1</b></div><div class="lounge-tv tv-orange">ORANGE COUNTRY<br><b>GAME NIGHT</b></div><div class="lounge-sign">PAPA'S • COLD ONES • CARDS • HOUSE HOUNDS</div></div>
      <button class="back" data-back>← CASINO FLOOR</button>
      <header class="papa-header"><small>PAPA'S SPORTS LOUNGE</small><h1>PAPA'S BLACKJACK</h1><p>Six decks • Dealer stands soft 17 • Blackjack pays 3:2</p></header>
      <div class="papa-scoreboard"><span>BIG BLUE FOOTBALL</span><b>21</b><span>ORANGE COUNTRY</span></div>
      <div class="papa-hud"><div><small>CASINO WALLET</small><strong>${this.money(this.getWalletUnits())}</strong></div><div><small>NEXT BET</small><strong>${this.money(this.selectedBetUnits)}</strong></div><div class="result-cell"><small>LAST HAND</small><strong>${this.lastReturnedUnits ? `${this.lastProfitUnits >= 0 ? "+" : ""}${this.money(this.lastProfitUnits)}` : "READY"}</strong></div></div>
      <div class="felt papa-felt">
        <div class="papa-corner"><div class="papa-chair"><span class="papa-head"><i class="papa-hair"></i><i class="papa-face"></i><i class="papa-beard"></i><i class="papa-smile"></i></span><b>PAPA'S GOOD CHAIR</b><em>PAPA</em></div><div class="cold-one" title="Papa's frosty table drink"><i></i>PAPA'S<br><b>COLD ONE</b></div></div>
        <div class="hound biggie"><i class="dog-head"><u></u><s></s></i><b>BIGGIE</b><span>HOUSE SECURITY</span></div>
        <div class="hound vern"><i class="dog-head"><u></u><s></s></i><b>VERN</b><span>TABLE MANAGEMENT</span></div>
        <div class="dealer-zone dealer-${this.dealerResult}"><small>DEALER</small><div class="cards">${dealerCards}</div><strong>${hideHole ? this.value(this.dealer.slice(0, 1)).total || "" : this.value(this.dealer).total || ""}</strong>${this.dealerResult ? `<em>${this.dealerResult === "bust" ? "DEALER BUST" : this.dealerResult === "push" ? "ALL PUSH" : "DEALER WINS"}</em>` : ""}</div>
        <div class="message">${this.message}</div>
        <div class="player-hands">${this.hands.length ? this.hands.map((hand, index) => `<article class="blackjack-hand ${this.roundActive && index === this.activeHand ? "active" : ""} ${this.handResultClass(hand)}"><small>HAND ${index + 1} • BET ${this.money(hand.betUnits)}</small><div class="cards">${hand.cards.map((card) => this.cardMarkup(card)).join("")}</div><strong>${this.value(hand.cards).total}</strong>${hand.result ? `<em>${hand.result}</em>${this.handPayoutMarkup(hand)}` : ""}</article>`).join("") : `<div class="empty-seat">PAPA GETS THE GOOD CHAIR</div>`}</div>
      </div>
      <div class="chip-rack">${[500, 1000, 2500, 5000, 10000].map((units) => `<button data-chip="${units}" class="chip chip-${units} ${this.selectedBetUnits === units ? "selected" : ""}" ${this.roundActive || units > this.getWalletUnits() ? "disabled" : ""}>${this.money(units)}</button>`).join("")}</div>
      <div class="table-controls papa-controls">
        <button data-deal ${this.roundActive || this.selectedBetUnits > this.getWalletUnits() ? "disabled" : ""}>DEAL</button>
        <button data-hit ${this.canHit(active) ? "" : "disabled"}>HIT</button>
        <button data-stand ${this.canHit(active) ? "" : "disabled"}>STAND</button>
        <button data-double ${this.canDouble(active) ? "" : "disabled"}>DOUBLE</button>
        <button data-split ${this.canSplit(active) ? "" : "disabled"}>SPLIT</button>
      </div>
      <button class="blackjack-rules" data-rules>TABLE RULES</button>
    </section>`;
    this.root.querySelector("[data-back]")?.addEventListener("click", () => { if (!this.roundActive || confirm("Leave the table and forfeit the active hand?")) this.onExit(); });
    this.root.querySelectorAll<HTMLElement>("[data-chip]").forEach((button) => button.addEventListener("click", () => { this.selectedBetUnits = Number(button.dataset.chip); this.render(); }));
    this.root.querySelector("[data-deal]")?.addEventListener("click", () => this.deal());
    this.root.querySelector("[data-hit]")?.addEventListener("click", () => this.hit());
    this.root.querySelector("[data-stand]")?.addEventListener("click", () => this.stand());
    this.root.querySelector("[data-double]")?.addEventListener("click", () => this.doubleDown());
    this.root.querySelector("[data-split]")?.addEventListener("click", () => this.split());
    this.root.querySelector("[data-rules]")?.addEventListener("click", () => alert("PAPA'S TABLE RULES\n\nSix-deck shoe\nDealer stands on soft 17\nBlackjack pays 3:2\nDouble on any first two cards\nDouble after split allowed\nSplit up to three hands\nSplit aces receive one card each\nBets: $5 to $100\nInsurance and surrender are not offered"));
  }

  private money(units: number): string { return `$${(units / 100).toFixed(2)}`; }
}
