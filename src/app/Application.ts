import { Application as PixiApplication, Assets, Color } from "pixi.js";
import { GameScene } from "../scenes/GameScene";
import { LocalPlayerProfileRepository, type PlayerProfile } from "../state/PlayerProfileStore";
import { PapasBlackjack } from "../games/PapasBlackjack";
import { RouletteGame } from "../games/Roulette";
import { runBeardBankMathLab } from "../games/BeardBank/BeardBankMathLab";
import { NeemasHighSeas } from "../games/NeemasHighSeas";
import { MeghsCosmicJam } from "../games/MeghsCosmicJam";

const cabinetAssetUrl = new URL("../../assets/beard-bank-2040-cabinet.png", import.meta.url).href;
const symbolAssetUrls = ["beard-coin", "oil", "crown", "comb", "vernon", "vault-door", "gold-crest"]
  .map((name) => new URL(`../../assets/concept-symbols/${name}.png`, import.meta.url).href);
const finishedSymbolAssetUrls = ["balm", "razor", "vault-crest", "luxury-kit"]
  .map((name) => new URL(`../../assets/generated/${name}.png`, import.meta.url).href)
  .concat(new URL("../../assets/key.svg", import.meta.url).href);
type GameId = "beard-bank" | "blackjack" | "roulette" | "free-drop" | "neema" | "megh";

export class Application {
  private pixi: PixiApplication | undefined;
  private readonly profiles = new LocalPlayerProfileRepository();
  private profile: PlayerProfile = this.profiles.load("guest");
  private walletUnits = this.profile.walletUnits;
  private readonly appRoot = document.getElementById("app")!;

  public async initialize(): Promise<void> { this.installDeveloperPanel(); this.showLobby(); }

  private installDeveloperPanel(): void {
    if (document.querySelector("[data-dev-panel]")) return;
    const host = document.createElement("div");
    host.className = "dev-tools";
    host.innerHTML = `<button class="dev-tools-toggle" data-dev-toggle title="Casino QA tools">QA</button><section data-dev-panel hidden><header><strong>CASINO TEST LAB</strong><button data-dev-close>×</button></header><small>BEARD BANK</small><div class="dev-grid">${[
      ["vault-heist", "Vault Heist"], ["free-spins", "Free Spins"], ["living-vault", "Living Vault"],
      ["vault-mini", "Mini Coin"], ["vault-minor", "Minor Coin"], ["vault-major", "Major Coin"],
      ["vault-grand", "Grand Coin"], ["vault-full", "Full Vault"],
      ["math-report", "1M Math Report"],
    ].map(([action,label]) => `<button data-dev-action="${action}">${label}</button>`).join("")}</div><small>ROULETTE • FORCE NEXT RESULT</small><div class="dev-result"><select data-dev-result><option>0</option><option>00</option>${Array.from({length:36},(_,i)=>`<option>${i+1}</option>`).join("")}</select><button data-dev-action="roulette-result">ARM RESULT</button></div><p>Only active in the matching game. Normal wagers and payouts still apply.</p></section>`;
    document.body.appendChild(host);
    const panel = host.querySelector<HTMLElement>("[data-dev-panel]")!;
    const toggle = (): void => { panel.hidden = !panel.hidden; };
    host.querySelector("[data-dev-toggle]")?.addEventListener("click", toggle);
    host.querySelector("[data-dev-close]")?.addEventListener("click", toggle);
    host.querySelectorAll<HTMLElement>("[data-dev-action]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.devAction === "math-report") { panel.hidden = true; this.showMathReport(); return; }
      const result = host.querySelector<HTMLSelectElement>("[data-dev-result]")!.value;
      window.dispatchEvent(new CustomEvent("casino:dev", { detail: { action: button.dataset.devAction, result } }));
      panel.hidden = true;
    }));
    window.addEventListener("keydown", (event) => { if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") toggle(); });
  }

  private showMathReport(): void {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `<div class="atm-modal"><small>BEARD BANK • VERIFIED TEST LAB</small><h2>Running 1,000,000 spins…</h2><p>This calculates outcomes from the actual reel strips and paytable. The browser may work hard for a few seconds. Tiny casino accountant, enormous spreadsheet.</p></div>`;
    document.body.appendChild(modal);
    window.setTimeout(() => {
      const report = runBeardBankMathLab(1_000_000);
      const oneIn = (frequency: number): string => frequency > 0 ? `1 in ${(1 / frequency).toFixed(1)}` : "Not observed";
      modal.innerHTML = `<div class="atm-modal"><button class="close" data-close>×</button><small>BEARD BANK V32 • 1,000,000 SPINS</small><h2>Verified Complete Math</h2><div class="math-report-grid">
        <p><span>Total RTP</span><strong>${(report.totalRtp * 100).toFixed(2)}%</strong></p>
        <p><span>Base RTP</span><strong>${(report.baseRtp * 100).toFixed(2)}%</strong></p>
        <p><span>Vault Heist RTP</span><strong>${(report.vaultHeistRtp * 100).toFixed(2)}%</strong></p>
        <p><span>Free Spins RTP</span><strong>${(report.freeSpinsRtp * 100).toFixed(2)}%</strong></p>
        <p><span>Living Vault RTP</span><strong>${(report.livingVaultRtp * 100).toFixed(2)}%</strong></p>
        <p><span>Any win</span><strong>${(report.hitFrequency * 100).toFixed(2)}%</strong></p>
        <p><span>Win ≥ bet</span><strong>${(report.profitableSpinFrequency * 100).toFixed(2)}%</strong></p>
        <p><span>Vault Heist</span><strong>${oneIn(report.vaultHeistFrequency)}</strong></p>
        <p><span>Free Spins</span><strong>${oneIn(report.freeSpinsFrequency)}</strong></p>
        <p><span>Living Vault</span><strong>Hidden mystery trigger</strong></p>
        <p><span>Longest losing streak</span><strong>${report.longestLosingStreak}</strong></p>
        <p><span>Largest total win</span><strong>${report.maximumTotalWinX.toFixed(2)}×</strong></p>
      </div><p>Production reel strips, Vault Heist, Free Spins, and Living Vault are all included. Results are deterministic for regression testing.</p><button class="primary" data-close>RETURN TO CASINO</button></div>`;
      modal.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => modal.remove()));
    }, 50);
  }

  private saveWallet(units: number): void {
    this.walletUnits = Math.max(0, Math.round(units));
    this.profile = { ...this.profile, walletUnits: this.walletUnits, updatedAtIso: new Date().toISOString() };
    this.profiles.save(this.profile);
  }

  private saveBeardBankProgress(livingVaultCharges: number, lifetimeCoinsCollected: number): void {
    this.profile = { ...this.profile, beardBank: { livingVaultCharges, lifetimeCoinsCollected }, updatedAtIso: new Date().toISOString() };
    this.profiles.save(this.profile);
  }

  private money(units = this.walletUnits): string { return `$${(units / 100).toFixed(2)}`; }

  private showLobby(): void {
    this.destroyPixi();
    this.appRoot.innerHTML = `
      <section class="casino-shell">
        <header class="casino-header"><div><span class="eyebrow">WELCOME TO</span><h1>BEARD LAWS CASINO</h1></div><div class="player-cluster"><span class="player-name">${this.profile.displayName}</span><div class="wallet-pill"><small>CASINO WALLET</small><strong>${this.money()}</strong></div></div></header>
        <div class="hero"><div><p class="kicker">THE HOUSE THAT BEARDS BUILT</p><h2>Your night. Your bankroll. Your game.</h2><p>Start with a fictional entertainment bankroll, chase the Beard Bank vault, or take a seat at Papa's table.</p></div><button class="atm-button" data-atm>VISIT ATM <span>+</span></button></div>
        <div class="floor-label"><span>CASINO FLOOR</span><span>Fictional credits • No real money</span></div>
        <div class="game-grid">
          ${this.gameCard("beard-bank", "FLAGSHIP SLOT", "BEARD BANK", "Crack the Living Vault", "live gold")}
          ${this.gameCard("blackjack", "TABLE GAME", "PAPA'S BLACKJACK", "Classic 21 with family-room swagger", "prototype")}
          ${this.gameCard("roulette", "TABLE GAME", "ROYAL ROULETTE", "Full American wheel and multi-bet table", "prototype red")}
          ${this.gameCard("free-drop", "ORIGINAL GAME", "BEARDFALL ROULETTE", "Drop it. Bounce it. Let the beardwall decide.", "prototype purple")}
          ${this.gameCard("neema", "FEATURE SLOT", "NEEMA'S HIGH SEAS HAPPY HOUR", "Cabin upgrades, cruise tickets, and one glorious Last Call", "live rose")}
          ${this.gameCard("megh", "CASCADE SLOT", "MEGH'S COSMIC JAM", "Tractor-beam tumbles, space goats, and the Intergalactic Encore", "live cosmic")}
        </div>
      </section>`;
    this.appRoot.querySelector("[data-atm]")?.addEventListener("click", () => this.showAtm());
    this.appRoot.querySelectorAll<HTMLElement>("[data-game]").forEach((card) => card.addEventListener("click", () => this.openGame(card.dataset.game as GameId)));
  }

  private gameCard(id: GameId, eyebrow: string, title: string, copy: string, classes: string): string {
    return `<button class="game-card ${classes}" data-game="${id}"><span class="card-status">${classes.includes("live") ? "PLAY NOW" : classes.includes("prototype") ? "EARLY ACCESS" : "PREVIEW"}</span><small>${eyebrow}</small><h3>${title}</h3><p>${copy}</p><span class="enter">${classes.includes("preview") ? "EXPLORE →" : "ENTER GAME →"}</span></button>`;
  }

  private showAtm(): void {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `<div class="atm-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO CASHIER</small><h2>Choose tonight's bankroll</h2><p>These are fictional entertainment credits. Nothing is deposited, purchased, or withdrawn.</p><div class="amounts">${[2000,5000,10000,20000].map((v) => `<button data-amount="${v}">${this.money(v)}</button>`).join("")}</div><label>Custom amount ($)<input data-custom type="number" min="1" max="10000" value="200"></label><button class="primary" data-deposit>LOAD CASINO WALLET</button><button class="cashout" data-clear>CASH OUT & END SESSION</button></div>`;
    document.body.appendChild(modal);
    modal.querySelector("[data-close]")?.addEventListener("click", () => modal.remove());
    modal.querySelectorAll<HTMLElement>("[data-amount]").forEach((button) => button.addEventListener("click", () => { this.saveWallet(Number(button.dataset.amount)); modal.remove(); this.showLobby(); }));
    modal.querySelector("[data-deposit]")?.addEventListener("click", () => { const input = modal.querySelector<HTMLInputElement>("[data-custom]")!; this.saveWallet(Math.min(1_000_000, Math.max(100, Number(input.value) * 100))); modal.remove(); this.showLobby(); });
    modal.querySelector("[data-clear]")?.addEventListener("click", () => { this.saveWallet(0); modal.remove(); this.showLobby(); });
  }

  private openGame(id: GameId): void {
    if (this.walletUnits <= 0) { this.showAtm(); return; }
    if (id === "beard-bank") { void this.openBeardBank(); return; }
    if (id === "blackjack") { this.openBlackjack(); return; }
    if (id === "roulette") { this.openRoulette(false); return; }
    if (id === "free-drop") { this.openRoulette(true); return; }
    if (id === "neema") { new NeemasHighSeas(this.appRoot, () => this.walletUnits, (units) => this.saveWallet(units), () => this.showLobby()).open(); return; }
    new MeghsCosmicJam(this.appRoot, () => this.walletUnits, (units) => this.saveWallet(units), () => this.showLobby()).open();
  }

  private async openBeardBank(): Promise<void> {
    this.appRoot.innerHTML = "";
    this.pixi = new PixiApplication();
    await Promise.all([this.pixi.init({ resizeTo: window, background: new Color(0x12081f), antialias: true }), Assets.load([cabinetAssetUrl, ...symbolAssetUrls, ...finishedSymbolAssetUrls])]);
    this.appRoot.appendChild(this.pixi.canvas);
    new GameScene(this.pixi, this.walletUnits, this.profile.beardBank, (units) => this.saveWallet(units), (charges, lifetimeCoins) => this.saveBeardBankProgress(charges, lifetimeCoins), () => this.showLobby()).initialize();
  }

  private openBlackjack(): void {
    new PapasBlackjack(
      this.appRoot,
      () => this.walletUnits,
      (units) => this.saveWallet(units),
      () => this.showLobby(),
    ).open();
  }

  private openRoulette(freeDrop: boolean): void {
    new RouletteGame(this.appRoot, freeDrop, () => this.walletUnits, (units) => this.saveWallet(units), () => this.showLobby()).open();
  }

  private destroyPixi(): void { if (this.pixi) { this.pixi.destroy(true, { children: true }); this.pixi = undefined; } }
}
