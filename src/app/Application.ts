import { Application as PixiApplication } from "pixi.js";
import {
  LocalPlayerProfileRepository,
  type PlayerProfile,
} from "../state/PlayerProfileStore";
import { PapasBlackjack } from "../games/PapasBlackjack";
import { RouletteGame } from "../games/Roulette";
import { runBeardBankMathLab } from "../games/BeardBank/BeardBankMathLab";
import { NeemasHighSeas } from "../games/NeemasHighSeas";
import { MeghsCosmicJam } from "../games/MeghsCosmicJam";
import { AccountService } from "../state/AccountService";
import { applyActivity, rankForXp, type CasinoActivity } from "../state/CasinoProgression";
import { CasinoAudio } from "../graphics/CasinoAudio";
import { BeardBankDOM } from "../games/BeardBank/BeardBankDOM";

type GameId =
  | "beard-bank"
  | "blackjack"
  | "roulette"
  | "free-drop"
  | "neema"
  | "megh";

export class Application {
  private pixi: PixiApplication | undefined;
  private readonly profiles = new LocalPlayerProfileRepository();
  private readonly accounts = new AccountService();
  private profile: PlayerProfile = this.profiles.load("guest");
  private walletUnits = this.profile.walletUnits;
  private readonly appRoot = document.getElementById("app")!;
  private readonly audio = new CasinoAudio();

  public async initialize(): Promise<void> {
    this.installDeveloperPanel();
    this.installSoundControl();
    const account = await this.accounts.restore();
    if (account.session) {
      const cloud = await this.accounts.loadProfile();
      if (cloud) {
        this.profile = cloud;
        this.walletUnits = cloud.walletUnits;
      }
    }
    this.showLobby();
  }

  private installSoundControl(): void {
    const button = document.createElement("button"); button.className = "sound-toggle"; button.textContent = "⚙ EXPERIENCE";
    const applyMotion = (): void => { document.documentElement.classList.toggle("reduced-motion", localStorage.getItem("beard-laws-casino-motion") === "reduced"); };
    applyMotion();
    button.addEventListener("click", () => {
      const modal=document.createElement("div");modal.className="modal-backdrop";
      const render=():void=>{const reduced=localStorage.getItem("beard-laws-casino-motion")==="reduced";const turbo=localStorage.getItem("beard-laws-casino-turbo")==="on";modal.innerHTML=`<div class="atm-modal experience-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • V52</small><h2>Experience Settings</h2><div class="experience-grid"><button data-sound>SOUND <b>${this.audio.isEnabled()?"ON":"OFF"}</b></button><button data-haptics>HAPTICS <b>${this.audio.isHapticsEnabled()?"ON":"OFF"}</b></button><button data-turbo>TURBO <b>${turbo?"ON":"OFF"}</b></button><button data-motion>MOTION <b>${reduced?"REDUCED":"FULL"}</b></button></div><p>Settings stay on this device. Reduced Motion removes nonessential celebration movement.</p></div>`;modal.querySelector("[data-close]")?.addEventListener("click",()=>modal.remove());modal.querySelector("[data-sound]")?.addEventListener("click",()=>{this.audio.toggle();render();});modal.querySelector("[data-haptics]")?.addEventListener("click",()=>{this.audio.toggleHaptics();render();});modal.querySelector("[data-turbo]")?.addEventListener("click",()=>{localStorage.setItem("beard-laws-casino-turbo",turbo?"off":"on");render();});modal.querySelector("[data-motion]")?.addEventListener("click",()=>{localStorage.setItem("beard-laws-casino-motion",reduced?"full":"reduced");applyMotion();render();});};
      render();document.body.appendChild(modal);
    }); document.body.appendChild(button);
  }

  private installDeveloperPanel(): void {
    if (document.querySelector("[data-dev-panel]")) return;
    const host = document.createElement("div");
    host.className = "dev-tools";
    host.innerHTML = `<button class="dev-tools-toggle" data-dev-toggle title="Casino QA tools">QA</button><section data-dev-panel hidden><header><strong>CASINO TEST LAB</strong><button data-dev-close>×</button></header><small>BEARD BANK</small><div class="dev-grid">${[
      ["vault-heist", "Vault Heist"],
      ["free-spins", "Free Spins"],
      ["living-vault", "Living Vault"],
      ["vault-mini", "Mini Coin"],
      ["vault-minor", "Minor Coin"],
      ["vault-major", "Major Coin"],
      ["vault-grand", "Grand Coin"],
      ["vault-full", "Full Vault"],
      ["math-report", "1M Math Report"],
    ]
      .map(
        ([action, label]) =>
          `<button data-dev-action="${action}">${label}</button>`,
      )
      .join(
        "",
      )}</div><small>ROULETTE • FORCE NEXT RESULT</small><div class="dev-result"><select data-dev-result><option>0</option><option>00</option>${Array.from({ length: 36 }, (_, i) => `<option>${i + 1}</option>`).join("")}</select><button data-dev-action="roulette-result">ARM RESULT</button></div><p>Only active in the matching game. Normal wagers and payouts still apply.</p></section>`;
    document.body.appendChild(host);
    const panel = host.querySelector<HTMLElement>("[data-dev-panel]")!;
    const toggle = (): void => {
      panel.hidden = !panel.hidden;
    };
    host.querySelector("[data-dev-toggle]")?.addEventListener("click", toggle);
    host.querySelector("[data-dev-close]")?.addEventListener("click", toggle);
    host.querySelectorAll<HTMLElement>("[data-dev-action]").forEach((button) =>
      button.addEventListener("click", () => {
        if (button.dataset.devAction === "math-report") {
          panel.hidden = true;
          this.showMathReport();
          return;
        }
        const result =
          host.querySelector<HTMLSelectElement>("[data-dev-result]")!.value;
        window.dispatchEvent(
          new CustomEvent("casino:dev", {
            detail: { action: button.dataset.devAction, result },
          }),
        );
        panel.hidden = true;
      }),
    );
    window.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d")
        toggle();
    });
  }

  private showMathReport(): void {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `<div class="atm-modal"><small>BEARD BANK • VERIFIED TEST LAB</small><h2>Running 1,000,000 spins…</h2><p>This calculates outcomes from the actual reel strips and paytable. The browser may work hard for a few seconds. Tiny casino accountant, enormous spreadsheet.</p></div>`;
    document.body.appendChild(modal);
    window.setTimeout(() => {
      const report = runBeardBankMathLab(1_000_000);
      const oneIn = (frequency: number): string =>
        frequency > 0 ? `1 in ${(1 / frequency).toFixed(1)}` : "Not observed";
      modal.innerHTML = `<div class="atm-modal"><button class="close" data-close>×</button><small>BEARD BANK V52 • 1,000,000 SPINS</small><h2>Verified Complete Math</h2><div class="math-report-grid">
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
      modal
        .querySelectorAll("[data-close]")
        .forEach((button) =>
          button.addEventListener("click", () => modal.remove()),
        );
    }, 50);
  }

  private saveWallet(units: number): void {
    this.walletUnits = Math.max(0, Math.round(units));
    this.profile = {
      ...this.profile,
      walletUnits: this.walletUnits,
      updatedAtIso: new Date().toISOString(),
    };
    this.profiles.save(this.profile);
    this.accounts.saveProfile(this.profile);
  }

  private saveBeardBankProgress(
    livingVaultCharges: number,
    lifetimeCoinsCollected: number,
  ): void {
    this.profile = {
      ...this.profile,
      beardBank: { livingVaultCharges, lifetimeCoinsCollected },
      updatedAtIso: new Date().toISOString(),
    };
    this.profiles.save(this.profile);
    this.accounts.saveProfile(this.profile);
  }

  private money(units = this.walletUnits): string {
    return `$${(units / 100).toFixed(2)}`;
  }

  private recordActivity(activity: CasinoActivity): void {
    this.audio.activity(activity);
    let casino = applyActivity(this.profile.casino, activity);
    const readyRewards = casino.missions.filter((mission) => mission.progress >= mission.target && !mission.claimed);
    let walletUnits = this.walletUnits;
    if (readyRewards.length === casino.missions.length && readyRewards.length > 0) {
      walletUnits += readyRewards.reduce((sum, mission) => sum + mission.reward, 0);
      casino = { ...casino, missions: casino.missions.map((mission) => ({ ...mission, claimed: true })) };
    }
    this.walletUnits = walletUnits;
    this.profile = { ...this.profile, walletUnits, casino, updatedAtIso: new Date().toISOString() };
    this.profiles.save(this.profile);
    this.accounts.saveProfile(this.profile);
  }

  private showLobby(): void {
    this.destroyPixi();
    const rank = rankForXp(this.profile.casino.xp);
    const rankPercent = rank.next > this.profile.casino.xp ? Math.min(100, Math.round((this.profile.casino.xp / rank.next) * 100)) : 100;
    const completed = this.profile.casino.missions.filter((mission) => mission.progress >= mission.target).length;
    this.appRoot.innerHTML = `
      <section class="casino-shell">
        <header class="casino-header"><div><span class="eyebrow">WELCOME TO</span><h1>BEARD LAWS CASINO</h1></div><div class="player-cluster"><button class="profile-button" data-profile><small>${this.accounts.state().session ? "CLOUD PLAYER" : "GUEST MODE"}</small><strong>${this.profile.displayName}</strong></button><button class="rank-pill" data-stats><small>RANK ${rank.level}</small><strong>${rank.name}</strong><i><span style="width:${rankPercent}%"></span></i></button><div class="wallet-pill"><small>CASINO WALLET</small><strong>${this.money()}</strong></div></div></header>
        <div class="hero"><div><p class="kicker">THE HOUSE THAT BEARDS BUILT</p><h2>Your night. Your bankroll. Your game.</h2><p>Start with a fictional entertainment bankroll, chase the Beard Bank vault, or take a seat at Papa's table.</p></div><button class="atm-button" data-atm>VISIT ATM <span>+</span></button></div>
        <section class="casino-dashboard"><button data-missions><small>DAILY MISSIONS</small><strong>${completed} / 3 COMPLETE</strong><span>${this.profile.casino.missions.map((m) => `<i class="${m.progress >= m.target ? "done" : ""}">${Math.min(m.progress, m.target)}/${m.target}</i>`).join("")}</span></button><button data-stats><small>CASINO PASSPORT</small><strong>${this.profile.casino.achievements.length} STAMPS EARNED</strong><span>Best ${this.profile.casino.biggestMultiplier.toFixed(1)}×</span></button><button data-leaderboard><small>CASINO LEADERBOARD</small><strong>THE BEARD BOARD</strong><span>Players • records • recent legends</span></button><button data-daily><small>DAILY BEARD PASS</small><strong>DAY ${this.profile.casino.dailyStreak} OF 7</strong><span>Return tomorrow to advance</span></button></section>
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
    this.appRoot
      .querySelector("[data-atm]")
      ?.addEventListener("click", () => this.showAtm());
    this.appRoot
      .querySelector("[data-profile]")
      ?.addEventListener("click", () => this.showAccount());
    this.appRoot.querySelector("[data-missions]")?.addEventListener("click", () => this.showProgress("missions"));
    this.appRoot.querySelectorAll("[data-stats]").forEach((node) => node.addEventListener("click", () => this.showProgress("stats")));
    this.appRoot.querySelector("[data-daily]")?.addEventListener("click", () => this.showProgress("daily"));
    this.appRoot.querySelector("[data-leaderboard]")?.addEventListener("click", () => { void this.showLeaderboard(); });
    this.appRoot
      .querySelectorAll<HTMLElement>("[data-game]")
      .forEach((card) =>
        card.addEventListener("click", () =>
          this.openGame(card.dataset.game as GameId),
        ),
      );
  }

  private async showLeaderboard(): Promise<void> {
    const modal = document.createElement("div"); modal.className = "modal-backdrop";
    modal.innerHTML = `<section class="progress-modal leaderboard-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • V60</small><h2>The Beard Board</h2><p>Loading public Casino Cards…</p></section>`; document.body.appendChild(modal);
    modal.querySelector("[data-close]")?.addEventListener("click", () => modal.remove());
    const players = await this.accounts.leaderboard();
    const rows = players.length ? players.map((p,i)=>`<button class="leader-row" data-card="${i}"><b>${i+1}</b><span><strong>${p.display_name}</strong><small>${p.favorite_game.replaceAll("-"," ").toUpperCase()} • ${p.total_spins} PLAYS</small></span><em>${Number(p.biggest_multiplier).toFixed(1)}×</em></button>`).join("") : `<div class="leader-empty"><strong>THE FLOOR IS WAITING</strong><p>Run the V60 database setup once, then registered players will appear here automatically. Guest profiles remain private.</p></div>`;
    modal.querySelector("section")!.innerHTML = `<button class="close" data-close>×</button><small>BEARD LAWS CASINO • V60</small><h2>The Beard Board</h2><div class="leader-tabs"><span>BIGGEST MULTIPLIER</span><span>ALL TIME</span></div><div class="leader-list">${rows}</div><p class="privacy-note">Public cards show display names and game records only. Emails and wallet balances never appear.</p>`;
    modal.querySelector("[data-close]")?.addEventListener("click",()=>modal.remove());
    modal.querySelectorAll<HTMLElement>("[data-card]").forEach((node)=>node.addEventListener("click",()=>{const p=players[Number(node.dataset.card)]!;this.showCasinoCard(p);}));
  }

  private showCasinoCard(p: import("../state/AccountService").LeaderboardPlayer): void {
    const card=document.createElement("div");card.className="modal-backdrop";card.innerHTML=`<section class="casino-card"><button class="close" data-close>×</button><small>OFFICIAL CASINO CARD</small><h2>${p.display_name}</h2><div class="casino-card-rank">LEVEL ${p.casino_level}</div><div><p><span>BEST WIN</span><b>${Number(p.biggest_multiplier).toFixed(1)}×</b></p><p><span>PLAYS</span><b>${p.total_spins}</b></p><p><span>FEATURES</span><b>${p.total_bonuses}</b></p><p><span>ACHIEVEMENTS</span><b>${p.achievement_count}</b></p></div><strong>FAVORITE • ${p.favorite_game.replaceAll("-"," ").toUpperCase()}</strong></section>`;document.body.appendChild(card);card.querySelector("[data-close]")?.addEventListener("click",()=>card.remove());
  }

  private showProgress(tab: "missions" | "stats" | "daily"): void {
    const rank = rankForXp(this.profile.casino.xp);
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    const missions = this.profile.casino.missions.map((m) => `<li class="${m.progress >= m.target ? "complete" : ""}"><div><b>${m.label}</b><span>${m.progress} / ${m.target}</span></div><strong>+$${(m.reward / 100).toFixed(2)}</strong></li>`).join("");
    const achievements = this.profile.casino.achievements.length ? this.profile.casino.achievements.map((a) => `<span>${a}</span>`).join("") : "<p>Trigger a feature or chase a 50× win to earn your first stamp.</p>";
    modal.innerHTML = `<section class="progress-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • V52</small><h2>${tab === "missions" ? "Daily Missions" : tab === "daily" ? "Daily Beard Pass" : "Casino Passport"}</h2>${tab === "missions" ? `<ul class="mission-list">${missions}</ul><p>Complete missions by playing. Finished rewards are added automatically when all three are complete.</p>` : tab === "daily" ? `<div class="beard-pass">${Array.from({length:7},(_,i)=>`<span class="${i < this.profile.casino.dailyStreak ? "active" : ""}"><b>DAY ${i+1}</b><i>${i===6?"BONUS PICK":`$${(2+i).toFixed(2)}`}</i></span>`).join("")}</div><p>One visit per UTC day advances the pass. No purchases, no fake countdown, no nonsense.</p>` : `<div class="passport-stats"><p><span>RANK</span><b>${rank.name}</b></p><p><span>XP</span><b>${this.profile.casino.xp}</b></p><p><span>TOTAL SPINS</span><b>${this.profile.casino.totalSpins}</b></p><p><span>FEATURES</span><b>${this.profile.casino.totalBonuses}</b></p><p><span>BIGGEST WIN</span><b>${this.money(this.profile.casino.biggestWinUnits)}</b></p><p><span>FAVORITE</span><b>${this.profile.casino.favoriteGame.toUpperCase()}</b></p></div><div class="passport-stamps">${achievements}</div>`}<button class="primary" data-close>RETURN TO CASINO</button></section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll("[data-close]").forEach((node) => node.addEventListener("click", () => modal.remove()));
  }

  private showAccount(message = ""): void {
    const state = this.accounts.state();
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    if (state.session) {
      modal.innerHTML = `<div class="atm-modal account-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • V52</small><h2>Cloud Player</h2><p class="account-email">${state.email}</p><div class="account-stat"><span>CASINO WALLET</span><strong>${this.money()}</strong></div><p>Your login and casino profile are saved across devices.</p><button class="primary" data-signout>SIGN OUT</button><button class="cashout" data-guest>SWITCH TO GUEST MODE</button></div>`;
    } else {
      modal.innerHTML = `<div class="atm-modal account-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • V52</small><h2>Player Account</h2><p>${state.connected ? "Sign in to restore your private cloud wallet." : "Cloud accounts need the Supabase connection in your .env file before building."}</p><p class="account-message" data-account-message>${message}</p><label>Email<input data-email type="email" autocomplete="email"></label><label>Password<input data-password type="password" minlength="6" autocomplete="current-password"></label><button class="primary" data-signin ${state.connected ? "" : "disabled"}>SIGN IN</button><button class="account-secondary" data-signup ${state.connected ? "" : "disabled"}>CREATE ACCOUNT</button><button class="cashout" data-reset ${state.connected ? "" : "disabled"}>FORGOT PASSWORD</button></div>`;
    }
    document.body.appendChild(modal);
    const close = (): void => modal.remove();
    modal.querySelector("[data-close]")?.addEventListener("click", close);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    const credentials = (): { email: string; password: string } => ({
      email:
        modal.querySelector<HTMLInputElement>("[data-email]")?.value.trim() ??
        "",
      password:
        modal.querySelector<HTMLInputElement>("[data-password]")?.value ?? "",
    });
    const status = (text: string): void => {
      const node = modal.querySelector<HTMLElement>("[data-account-message]");
      if (node) node.textContent = text;
    };
    modal
      .querySelector("[data-signin]")
      ?.addEventListener("click", async () => {
        const { email, password } = credentials();
        status("SIGNING IN…");
        const error = await this.accounts.signIn(email, password);
        if (error) {
          status(error);
          return;
        }
        const cloud = await this.accounts.loadProfile();
        if (cloud) {
          this.profile = cloud;
          this.walletUnits = cloud.walletUnits;
        }
        close();
        this.showLobby();
      });
    modal
      .querySelector("[data-signup]")
      ?.addEventListener("click", async () => {
        const { email, password } = credentials();
        status("CREATING ACCOUNT…");
        const result = await this.accounts.signUp(email, password);
        if (result.error) {
          status(result.error);
          return;
        }
        if (result.confirmationRequired) {
          status(
            "Check your email and confirm the account. Then return here and sign in.",
          );
          return;
        }
        const cloud = await this.accounts.loadProfile();
        if (cloud) {
          this.profile = cloud;
          this.walletUnits = cloud.walletUnits;
        }
        close();
        this.showLobby();
      });
    modal.querySelector("[data-reset]")?.addEventListener("click", async () => {
      const email = credentials().email;
      if (!email) {
        status("Enter your email first.");
        return;
      }
      const error = await this.accounts.resetPassword(email);
      status(error ?? "Password-reset email sent.");
    });
    modal
      .querySelector("[data-signout]")
      ?.addEventListener("click", async () => {
        await this.accounts.flush();
        await this.accounts.signOut();
        this.loadGuest();
        close();
        this.showLobby();
      });
    modal.querySelector("[data-guest]")?.addEventListener("click", async () => {
      await this.accounts.flush();
      await this.accounts.signOut();
      this.loadGuest();
      close();
      this.showLobby();
    });
  }

  private loadGuest(): void {
    this.profile = this.profiles.load("guest");
    this.walletUnits = this.profile.walletUnits;
  }

  private gameCard(
    id: GameId,
    eyebrow: string,
    title: string,
    copy: string,
    classes: string,
  ): string {
    return `<button class="game-card ${classes}" data-game="${id}"><span class="card-status">${classes.includes("live") ? "PLAY NOW" : classes.includes("prototype") ? "EARLY ACCESS" : "PREVIEW"}</span><small>${eyebrow}</small><h3>${title}</h3><p>${copy}</p><span class="enter">${classes.includes("preview") ? "EXPLORE →" : "ENTER GAME →"}</span></button>`;
  }

  private showAtm(): void {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `<div class="atm-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO CASHIER</small><h2>Choose tonight's bankroll</h2><p>These are fictional entertainment credits. Nothing is deposited, purchased, or withdrawn.</p><div class="amounts">${[2000, 5000, 10000, 20000].map((v) => `<button data-amount="${v}">${this.money(v)}</button>`).join("")}</div><label>Custom amount ($)<input data-custom type="number" min="1" max="10000" value="200"></label><button class="primary" data-deposit>LOAD CASINO WALLET</button><button class="cashout" data-clear>CASH OUT & END SESSION</button></div>`;
    document.body.appendChild(modal);
    modal
      .querySelector("[data-close]")
      ?.addEventListener("click", () => modal.remove());
    modal.querySelectorAll<HTMLElement>("[data-amount]").forEach((button) =>
      button.addEventListener("click", () => {
        this.saveWallet(Number(button.dataset.amount));
        modal.remove();
        this.showLobby();
      }),
    );
    modal.querySelector("[data-deposit]")?.addEventListener("click", () => {
      const input = modal.querySelector<HTMLInputElement>("[data-custom]")!;
      this.saveWallet(
        Math.min(1_000_000, Math.max(100, Number(input.value) * 100)),
      );
      modal.remove();
      this.showLobby();
    });
    modal.querySelector("[data-clear]")?.addEventListener("click", () => {
      this.saveWallet(0);
      modal.remove();
      this.showLobby();
    });
  }

  private openGame(id: GameId): void {
    if (this.walletUnits <= 0) {
      this.showAtm();
      return;
    }
    if (id === "beard-bank") {
      void this.openBeardBank();
      return;
    }
    if (id === "blackjack") {
      this.openBlackjack();
      return;
    }
    if (id === "roulette") {
      this.openRoulette(false);
      return;
    }
    if (id === "free-drop") {
      this.openRoulette(true);
      return;
    }
    if (id === "neema") {
      new NeemasHighSeas(
        this.appRoot,
        () => this.walletUnits,
        (units) => this.saveWallet(units),
        () => this.showLobby(),
        (activity) => this.recordActivity(activity),
      ).open();
      return;
    }
    new MeghsCosmicJam(
      this.appRoot,
      () => this.walletUnits,
      (units) => this.saveWallet(units),
      () => this.showLobby(),
      (activity) => this.recordActivity(activity),
    ).open();
  }

  private async openBeardBank(): Promise<void> {
    this.destroyPixi();
    new BeardBankDOM(this.appRoot, this.profile.beardBank, () => this.walletUnits,
      (units) => this.saveWallet(units), (charges, coins) => this.saveBeardBankProgress(charges, coins),
      () => this.showLobby(), (activity) => this.recordActivity(activity)).open();
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
    new RouletteGame(
      this.appRoot,
      freeDrop,
      () => this.walletUnits,
      (units) => this.saveWallet(units),
      () => this.showLobby(),
    ).open();
  }

  private destroyPixi(): void {
    if (this.pixi) {
      this.pixi.destroy(true, { children: true });
      this.pixi = undefined;
    }
  }
}
