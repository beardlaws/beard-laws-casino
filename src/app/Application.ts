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
import { BigBadBarber } from "../games/BigBadBarber";
import { CasinoTelemetryStore } from "../state/CasinoTelemetry";

type GameId =
  | "beard-bank"
  | "blackjack"
  | "roulette"
  | "free-drop"
  | "neema"
  | "megh"
  | "barber";

export class Application {
  private pixi: PixiApplication | undefined;
  private readonly profiles = new LocalPlayerProfileRepository();
  private readonly accounts = new AccountService();
  private profile: PlayerProfile = this.profiles.load("guest");
  private walletUnits = this.profile.walletUnits;
  private readonly appRoot = document.getElementById("app")!;
  private readonly audio = new CasinoAudio();
  private readonly telemetry = new CasinoTelemetryStore();
  private currentGameId: GameId | "lobby" = "lobby";

  public async initialize(): Promise<void> {
    this.installDeveloperPanel();
    window.addEventListener("casino:state", (event) => {
      const detail = (event as CustomEvent<{ state?: string }>).detail;
      if (detail?.state) this.telemetry.setState(detail.state);
    });
    this.installSoundControl();
    const account = await this.accounts.restore();
    if (account.session) {
      const cloud = await this.accounts.loadProfile();
      if (cloud) {
        this.profile = cloud;
        this.walletUnits = cloud.walletUnits;
        await this.accounts.publishStats(cloud);
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
    const gameForAction = (action: string): GameId | "any" => {
      if (action.startsWith("vault-") || action === "free-spins" || action === "living-vault" || action === "math-report") return "beard-bank";
      if (action.startsWith("barber-")) return "barber";
      if (action.startsWith("megh-")) return "megh";
      if (action.startsWith("neema-")) return "neema";
      if (action === "roulette-result") return "roulette";
      return "any";
    };
    const actions = (items: Array<[string, string]>): string => items.map(([action, label]) => `<button data-dev-action="${action}" data-game="${gameForAction(action)}">${label}</button>`).join("");
    host.innerHTML = `<button class="dev-tools-toggle" data-dev-toggle title="Casino QA tools">QA</button><section data-dev-panel hidden><header><strong>CASINO TEST LAB • V74</strong><button data-dev-close>×</button></header>
      <div class="dev-active"><span>ACTIVE CABINET</span><b data-dev-active>LOBBY</b><i data-dev-state>READY</i></div>
      <div class="dev-status" data-dev-status>QA ready. Open a cabinet, then trigger a test.</div>
      <div class="dev-telemetry" data-dev-summary></div><div class="dev-telemetry-table" data-dev-table></div>
      <div class="dev-qa-row"><label>ANIMATION SPEED<select data-dev-speed><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label><label><input type="checkbox" data-dev-close-after> CLOSE AFTER TRIGGER</label><button data-dev-pause>PAUSE ANIMATIONS</button><button data-dev-reset-telemetry>RESET TELEMETRY</button></div>
      <small>BEARD BANK</small><div class="dev-grid">${actions([["vault-heist","Vault Heist"],["free-spins","Free Spins"],["living-vault","Living Vault"],["vault-mini","Mini Coin"],["vault-minor","Minor Coin"],["vault-major","Major Coin"],["vault-grand","Grand Coin"],["vault-full","Full Vault"],["math-report","1M Math Report"]])}</div>
      <small>BIG BAD BARBER</small><div class="dev-grid">${actions([["barber-bonus","Force Shave Down"],["barber-attack","Force Barber Attack"],["barber-two-razors","Two-Razor Near Miss"],["barber-max-forts","Max Fortresses"]])}</div>
      <small>MEGH'S COSMIC JAM</small><div class="dev-grid">${actions([["megh-goat","Goat Stampede"],["megh-ufo","UFO Scan"],["megh-encore","Force Encore"],["megh-headliner","Headliner Mode"]])}</div>
      <small>NEEMA'S HIGH SEAS</small><div class="dev-grid">${actions([["neema-feature","Frozen Happy Hour"],["neema-captain","Captain Moment"],["neema-tickets","Three Tickets"],["neema-voyage","Final Voyage"]])}</div>
      <small>ROULETTE • FORCE NEXT RESULT</small><div class="dev-result"><select data-dev-result><option>0</option><option>00</option>${Array.from({ length: 36 }, (_, i) => `<option>${i + 1}</option>`).join("")}</select><button data-dev-action="roulette-result" data-game="roulette">ARM RESULT</button></div>
      <p>QA actions never alter production math. They only arm the matching active cabinet.</p></section>`;
    document.body.appendChild(host);
    const panel = host.querySelector<HTMLElement>("[data-dev-panel]")!;
    const status = host.querySelector<HTMLElement>("[data-dev-status]")!;
    const setStatus = (text: string, tone: "ok" | "error" | "running" = "ok"): void => { status.textContent = text; status.className = `dev-status ${tone}`; };
    const refresh = (): void => {
      const snap = this.telemetry.snapshot();
      host.querySelector<HTMLElement>("[data-dev-active]")!.textContent = this.currentGameId.toUpperCase();
      host.querySelector<HTMLElement>("[data-dev-state]")!.textContent = snap.gameState;
      const all = Object.values(snap.games);
      const spins = all.reduce((n, g) => n + (g?.spins ?? 0), 0);
      const features = all.reduce((n, g) => n + (g?.features ?? 0), 0);
      host.querySelector<HTMLElement>("[data-dev-summary]")!.innerHTML = `<p><span>RECORDED SPINS</span><b>${spins}</b></p><p><span>FEATURES</span><b>${features}</b></p><p><span>BEST MULTIPLIER</span><b>${this.profile.casino.biggestMultiplier.toFixed(1)}×</b></p><p><span>BEARD CHIPS</span><b>${this.profile.casino.beardChips}</b></p>`;
      const games: GameId[] = ["beard-bank","barber","megh","neema","roulette","blackjack","free-drop"];
      host.querySelector<HTMLElement>("[data-dev-table]")!.innerHTML = `<p><span>GAME</span><span>SPINS</span><span>FEATURES</span><span>DRY</span><span>RTP</span></p>${games.map((game) => { const g = snap.games[game]; const rtp = g && g.totalWagered > 0 ? `${(g.totalWon / g.totalWagered * 100).toFixed(1)}%` : "—"; return `<p><b>${game.toUpperCase()}</b><span>${g?.spins ?? 0}</span><span>${g?.features ?? 0}</span><span>${g ? Math.max(0, g.spins - g.lastFeatureSpin) : 0}</span><span>${rtp}</span></p>`; }).join("")}`;
      host.querySelectorAll<HTMLElement>("[data-dev-action]").forEach((button) => { const game = button.dataset.game; button.dataset.inactive = String(game !== "any" && game !== this.currentGameId); });
    };
    const toggle = (): void => { panel.hidden = !panel.hidden; if (!panel.hidden) refresh(); };
    host.querySelector("[data-dev-toggle]")?.addEventListener("click", toggle);
    host.querySelector("[data-dev-close]")?.addEventListener("click", toggle);
    host.querySelector<HTMLSelectElement>("[data-dev-speed]")?.addEventListener("change", (event) => { const speed = Number((event.target as HTMLSelectElement).value); this.telemetry.setAnimationSpeed(speed); setStatus(`Animation speed set to ${speed}×.`, "ok"); });
    host.querySelector("[data-dev-pause]")?.addEventListener("click", (event) => { document.body.classList.toggle("qa-paused"); (event.currentTarget as HTMLElement).textContent = document.body.classList.contains("qa-paused") ? "RESUME ANIMATIONS" : "PAUSE ANIMATIONS"; });
    host.querySelector("[data-dev-reset-telemetry]")?.addEventListener("click", () => { this.telemetry.reset(); refresh(); setStatus("Telemetry reset.", "ok"); });
    host.querySelectorAll<HTMLElement>("[data-dev-action]").forEach((button) => button.addEventListener("click", () => {
      const action = button.dataset.devAction ?? "";
      if (action === "math-report") { this.showMathReport(); setStatus("Math report launched.", "running"); return; }
      const required = gameForAction(action);
      if (required !== "any" && required !== this.currentGameId) { setStatus(`Open ${required.toUpperCase()} before using ${button.textContent?.trim()}.`, "error"); refresh(); return; }
      const result = host.querySelector<HTMLSelectElement>("[data-dev-result]")!.value;
      window.dispatchEvent(new CustomEvent("casino:dev", { detail: { action, result } }));
      setStatus(`ARMED: ${button.textContent?.trim()} on ${this.currentGameId.toUpperCase()}.`, "running");
      if (host.querySelector<HTMLInputElement>("[data-dev-close-after]")?.checked) panel.hidden = true;
      window.setTimeout(refresh, 120);
    }));
    window.addEventListener("casino:qa-result", (event) => { const detail = (event as CustomEvent<{ message?: string; ok?: boolean }>).detail; setStatus(detail?.message ?? "QA action complete.", detail?.ok === false ? "error" : "ok"); refresh(); });
    window.addEventListener("casino:state", refresh);
    window.addEventListener("keydown", (event) => { if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") toggle(); });
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
    if (activity.type === "spin" || activity.type === "bonus" || activity.type === "win") {
      this.telemetry.record(activity.game, activity.type, activity.type === "spin" ? (activity.wager ?? 0) : (activity.amount ?? 0));
    }
    let casino = applyActivity(this.profile.casino, activity);
    const readyRewards = casino.missions.filter((mission) => mission.progress >= mission.target && !mission.claimed);
    let walletUnits = this.walletUnits;
    if (readyRewards.length === casino.missions.length && readyRewards.length > 0) {
      const chipReward = readyRewards.reduce((sum, mission) => sum + mission.reward, 0);
      casino = { ...casino, beardChips: casino.beardChips + chipReward, missions: casino.missions.map((mission) => ({ ...mission, claimed: true })) };
    }
    this.walletUnits = walletUnits;
    this.profile = { ...this.profile, walletUnits, casino, updatedAtIso: new Date().toISOString() };
    this.profiles.save(this.profile);
    this.accounts.saveProfile(this.profile);
  }

  private applyUnlockedRewards(): void {
    const rewardClasses = ["skin-gold-barber", "goat-golden", "skin-neema-moon", "vault-royal", "spin-beard-burst", "barber-angry", "captain-gala"];
    rewardClasses.forEach((reward) => document.body.classList.toggle(`reward-${reward}`, this.profile.casino.unlockedRewards.includes(reward)));
  }

  private showLobby(): void {
    this.currentGameId = "lobby";
    this.telemetry.setActiveGame("lobby");
    this.applyUnlockedRewards();
    this.destroyPixi();
    const rank = rankForXp(this.profile.casino.xp);
    const rankPercent = rank.next > this.profile.casino.xp ? Math.min(100, Math.round((this.profile.casino.xp / rank.next) * 100)) : 100;
    const completed = this.profile.casino.missions.filter((mission) => mission.progress >= mission.target).length;
    this.appRoot.innerHTML = `
      <section class="casino-shell">
        <header class="casino-header"><div><span class="eyebrow">WELCOME TO</span><h1>BEARD LAWS CASINO</h1></div><div class="player-cluster"><button class="profile-button" data-profile><small>${this.accounts.state().session ? "PLAYER CARD INSERTED" : "GUEST MODE"}</small><strong>${this.profile.displayName}</strong></button><button class="rank-pill" data-stats><small>${this.profile.casino.xp} REPUTATION</small><strong>${rank.name}</strong><i><span style="width:${rankPercent}%"></span></i></button><div class="wallet-pill"><small>CASINO WALLET</small><strong>${this.money()}</strong></div></div></header>
        <div class="hero"><div><p class="kicker">THE HOUSE THAT BEARDS BUILT</p><h2>Your night. Your bankroll. Your game.</h2><p>Start with a fictional entertainment bankroll, chase the Beard Bank vault, or take a seat at Papa's table.</p></div><button class="atm-button" data-atm>VISIT ATM <span>+</span></button></div>
        <section class="casino-dashboard v73-dashboard"><button data-missions><small>DAILY MISSIONS</small><strong>${completed} / 3 COMPLETE</strong><span>${this.profile.casino.missions.map((m) => `<i class="${m.progress >= m.target ? "done" : ""}">${Math.min(m.progress, m.target)}/${m.target}</i>`).join("")}</span></button><button data-stats><small>CASINO PASSPORT</small><strong>${this.profile.casino.achievements.length} STAMPS EARNED</strong><span>Best ${this.profile.casino.biggestMultiplier.toFixed(1)}×</span></button><button data-leaderboard><small>CASINO LEADERBOARD</small><strong>THE BEARD BOARD</strong><span>Players • records • recent legends</span></button><button data-daily><small>DAILY BEARD PASS</small><strong>DAY ${this.profile.casino.dailyStreak} OF 7</strong><span>Return tomorrow to advance</span></button><button class="vault-button" data-vault><small>THE BEARD VAULT</small><strong>${this.profile.casino.beardChips} BEARD CHIPS</strong><span>Skins • characters • trophies</span></button></section>
        <div class="floor-label"><span>CASINO FLOOR</span><span>Fictional credits • No real money</span></div>
        <div class="game-grid">
          ${this.gameCard("beard-bank", "FLAGSHIP SLOT", "BEARD BANK", "Crack the Living Vault", "live gold")}
          ${this.gameCard("blackjack", "TABLE GAME", "PAPA'S BLACKJACK", "Classic 21 with family-room swagger", "prototype")}
          ${this.gameCard("roulette", "TABLE GAME", "ROYAL ROULETTE", "Full American wheel and multi-bet table", "prototype red")}
          ${this.gameCard("free-drop", "ORIGINAL GAME", "BEARDFALL ROULETTE", "Drop it. Bounce it. Let the beardwall decide.", "prototype purple")}
          ${this.gameCard("neema", "FEATURE SLOT", "NEEMA'S HIGH SEAS HAPPY HOUR", "Cabin upgrades, cruise tickets, and one glorious Last Call", "live rose")}
          ${this.gameCard("megh", "CASCADE SLOT", "MEGH'S COSMIC JAM", "Tractor-beam tumbles, space goats, and the Intergalactic Encore", "live cosmic")}
          ${this.gameCard("barber", "NEW FEATURE SLOT", "THE BIG BAD BARBER", "Build beard fortresses and survive the Shave Down", "live barber")}
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
    this.appRoot.querySelector("[data-vault]")?.addEventListener("click", () => this.showBeardVault());
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
    modal.innerHTML = `<section class="progress-modal leaderboard-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • V61</small><h2>The Beard Board</h2><p>Loading public Casino Cards…</p></section>`; document.body.appendChild(modal);
    modal.querySelector("[data-close]")?.addEventListener("click", () => modal.remove());
    if (this.accounts.state().session) await this.accounts.publishStats(this.profile);
    const result = await this.accounts.leaderboard();
    const players = result.players;
    const rows = result.status !== "ready" ? `<div class="leader-empty error"><strong>BEARD BOARD CONNECTION FAILED</strong><p>${result.message}</p><button data-retry>TRY AGAIN</button></div>` : players.length ? players.map((p,i)=>`<button class="leader-row" data-card="${i}"><b>${i+1}</b><span><strong>${p.display_name}</strong><small>${p.favorite_game.replaceAll("-"," ").toUpperCase()} • ${p.total_spins} PLAYS</small></span><em>${Number(p.biggest_multiplier).toFixed(1)}×</em></button>`).join("") : `<div class="leader-empty"><strong>FIRST NAME ON THE BOARD?</strong><p>The Beard Board is connected. Sign in and play once to publish your Casino Card. Guest profiles remain private.</p></div>`;
    modal.querySelector("section")!.innerHTML = `<button class="close" data-close>×</button><small>BEARD LAWS CASINO • V61</small><h2>The Beard Board</h2><div class="leader-tabs"><span>BIGGEST MULTIPLIER</span><span>ALL TIME</span></div><div class="leader-list">${rows}</div><p class="privacy-note">Public cards show display names and game records only. Emails and wallet balances never appear.</p>`;
    modal.querySelector("[data-close]")?.addEventListener("click",()=>modal.remove());
    modal.querySelector("[data-retry]")?.addEventListener("click",()=>{ modal.remove(); void this.showLeaderboard(); });
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
    const today = new Date().toISOString().slice(0, 10);
    const dailyClaimed = this.profile.casino.dailyRewardKey === today;
    const dailyRewards = [200, 300, 400, 500, 600, 750, 1000];
    const dailyReward = dailyRewards[Math.max(0, Math.min(6, this.profile.casino.dailyStreak - 1))]!;
    modal.innerHTML = `<section class="progress-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • V65</small><h2>${tab === "missions" ? "Daily Missions" : tab === "daily" ? "Daily Free Play" : "Beard Rewards Club"}</h2>${tab === "missions" ? `<ul class="mission-list">${missions}</ul><p>Complete missions by playing. Finished rewards are added automatically when all three are complete.</p>` : tab === "daily" ? `<div class="beard-pass">${dailyRewards.map((reward,i)=>`<span class="${i < this.profile.casino.dailyStreak ? "active" : ""}"><b>DAY ${i+1}</b><i>$${(reward/100).toFixed(2)} FP</i></span>`).join("")}</div><p>Claim once per UTC day. Free Play becomes fictional casino credit and never changes slot odds.</p><button class="primary" data-claim-daily ${dailyClaimed ? "disabled" : ""}>${dailyClaimed ? "TODAY'S FREE PLAY CLAIMED" : `CLAIM $${(dailyReward/100).toFixed(2)} FREE PLAY`}</button>` : `<div class="passport-stats"><p><span>CLUB TIER</span><b>${rank.name}</b></p><p><span>BEARD REPUTATION</span><b>${this.profile.casino.xp}</b></p><p><span>TOTAL COIN-IN</span><b>${this.money(this.profile.casino.totalWageredUnits)}</b></p><p><span>TOTAL SPINS</span><b>${this.profile.casino.totalSpins}</b></p><p><span>FEATURES</span><b>${this.profile.casino.totalBonuses}</b></p><p><span>BIGGEST WIN</span><b>${this.money(this.profile.casino.biggestWinUnits)}</b></p><p><span>FAVORITE</span><b>${this.profile.casino.favoriteGame.toUpperCase()}</b></p></div><p>Reputation never decreases. Beard Chips are earned from missions, features, and rare wins, then spent in the Beard Vault.</p><div class="passport-stamps">${achievements}</div>`}<button class="primary" data-close>RETURN TO CASINO</button></section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll("[data-close]").forEach((node) => node.addEventListener("click", () => modal.remove()));
    modal.querySelector("[data-claim-daily]")?.addEventListener("click", () => {
      const casino = { ...this.profile.casino, dailyRewardKey: today, dailyFreePlayUnits: this.profile.casino.dailyFreePlayUnits + dailyReward };
      this.walletUnits += dailyReward;
      this.profile = { ...this.profile, walletUnits: this.walletUnits, casino, updatedAtIso: new Date().toISOString() };
      this.profiles.save(this.profile); this.accounts.saveProfile(this.profile);
      modal.remove(); this.showProgress("daily");
    });
  }

  private showBeardVault(): void {
    const rewards = [
      { id: "skin-gold-barber", icon: "✂", name: "GILDED BARBER", copy: "Golden cabinet trim for Big Bad Barber", cost: 150, category: "CABINET" },
      { id: "goat-golden", icon: "🐐", name: "GOLDEN GOAT", copy: "Rare cosmetic goat visitor in Cosmic Jam", cost: 225, category: "CHARACTER" },
      { id: "skin-neema-moon", icon: "☾", name: "MOONLIGHT CRUISE", copy: "Night-voyage atmosphere for Neema", cost: 175, category: "CABINET" },
      { id: "vault-royal", icon: "♛", name: "ROYAL VAULT DOOR", copy: "Black-and-gold Living Vault skin", cost: 200, category: "CABINET" },
      { id: "spin-beard-burst", icon: "✦", name: "BEARD BURST", copy: "Celebration particles on larger wins", cost: 100, category: "EFFECT" },
      { id: "trophy-founder", icon: "🏆", name: "FOUNDING FAMILY", copy: "Permanent trophy for the family suite", cost: 75, category: "TROPHY" },
      { id: "goat-baby", icon: "🐐", name: "BABY SPACE GOAT", copy: "A tiny follower for future goat events", cost: 125, category: "CHARACTER" },
      { id: "barber-angry", icon: "😈", name: "RAGING BARBER", copy: "Alternate villain entrance animation", cost: 180, category: "CHARACTER" },
      { id: "captain-gala", icon: "⚓", name: "CAPTAIN'S GALA", copy: "Formal Captain Neema celebration outfit", cost: 160, category: "CHARACTER" },
    ];
    const trophies = [
      { id: "FIRST SPIN", icon: "🎰", name: "FIRST SPIN", copy: "The casino doors officially opened." },
      { id: "CENTURY CLUB", icon: "💯", name: "CENTURY CLUB", copy: "Complete 100 spins." },
      { id: "50× CLUB", icon: "✨", name: "50× CLUB", copy: "Land a 50× or larger win." },
      { id: "VAULT COLLECTOR", icon: "🔐", name: "VAULT COLLECTOR", copy: "Collect a Beard Bank coin." },
      { id: "COSMIC HEADLINER", icon: "🛸", name: "COSMIC HEADLINER", copy: "Reach Megh's full stage." },
      { id: "CAPTAIN'S DECK", icon: "🚢", name: "CAPTAIN'S DECK", copy: "Complete Neema's voyage ladder." },
      { id: "FIRST BARBER FEATURE", icon: "✂", name: "SHAVE DOWN", copy: "Trigger the Big Bad Barber feature." },
      { id: "FIRST MEGH FEATURE", icon: "🐐", name: "COSMIC ENCORE", copy: "Trigger Megh's feature." },
      { id: "FIRST NEEMA FEATURE", icon: "🍹", name: "FROZEN HAPPY HOUR", copy: "Trigger Neema's feature." },
    ];
    const owned = new Set(this.profile.casino.unlockedRewards);
    let tab: "shop" | "trophies" = "shop";
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    const render = (): void => {
      const unlockedTrophies = new Set(this.profile.casino.achievements);
      modal.innerHTML = `<section class="progress-modal beard-vault-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • FAMILY META-GAME</small><h2>The Beard Vault</h2><p>Every cabinet creates family memories. Reputation never decreases; Beard Chips unlock cosmetics only and never change odds.</p><div class="vault-balance"><p><span>BEARD REPUTATION</span><b>${this.profile.casino.xp}</b></p><p><span>SPENDABLE BEARD CHIPS</span><b>${this.profile.casino.beardChips}</b></p><p><span>COLLECTION</span><b>${owned.size} / ${rewards.length}</b></p><p><span>TROPHIES</span><b>${trophies.filter((t) => unlockedTrophies.has(t.id)).length} / ${trophies.length}</b></p></div><div class="vault-tabs"><button data-vault-tab="shop" class="${tab === "shop" ? "primary" : "account-secondary"}">REWARD SHOP</button><button data-vault-tab="trophies" class="${tab === "trophies" ? "primary" : "account-secondary"}">FAMILY TROPHY ROOM</button></div>${tab === "shop" ? `<div class="vault-shop">${rewards.map((reward) => `<button class="vault-item ${owned.has(reward.id) ? "owned" : ""}" data-reward="${reward.id}" ${owned.has(reward.id) ? "disabled" : ""}><i>${reward.icon}</i><small>${reward.category}</small><strong>${reward.name}</strong><span>${reward.copy}</span><b>${owned.has(reward.id) ? "OWNED" : `${reward.cost} CHIPS`}</b></button>`).join("")}</div><p class="vault-note">Features award Chips. Daily missions, rare wins, and future family challenges add more. Cosmetics never change RTP.</p>` : `<div class="trophy-room">${trophies.map((trophy) => { const unlocked = unlockedTrophies.has(trophy.id); return `<article class="trophy-card ${unlocked ? "" : "locked"}"><i>${unlocked ? trophy.icon : "?"}</i><b>${trophy.name}</b><span>${unlocked ? trophy.copy : "Keep playing to discover this trophy."}</span></article>`; }).join("")}</div>`}<button class="primary" data-close>RETURN TO CASINO</button></section>`;
      modal.querySelectorAll("[data-close]").forEach((node) => node.addEventListener("click", () => modal.remove()));
      modal.querySelectorAll<HTMLElement>("[data-vault-tab]").forEach((button) => button.addEventListener("click", () => { tab = button.dataset.vaultTab === "trophies" ? "trophies" : "shop"; render(); }));
      modal.querySelectorAll<HTMLButtonElement>("[data-reward]").forEach((button) => button.addEventListener("click", () => {
        const reward = rewards.find((item) => item.id === button.dataset.reward);
        if (!reward || owned.has(reward.id) || this.profile.casino.beardChips < reward.cost) return;
        owned.add(reward.id);
        const casino = { ...this.profile.casino, beardChips: this.profile.casino.beardChips - reward.cost, unlockedRewards: [...owned] };
        this.profile = { ...this.profile, casino, updatedAtIso: new Date().toISOString() };
        this.profiles.save(this.profile); this.accounts.saveProfile(this.profile); render();
      }));
    };
    render(); document.body.appendChild(modal);
  }

  private showAccount(message = ""): void {
    const state = this.accounts.state();
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    if (state.session) {
      modal.innerHTML = `<div class="atm-modal account-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • V62</small><h2>Player Profile</h2><p class="account-email">${state.email}</p><label>Casino username<input data-display-name maxlength="24" value="${this.escapeAttribute(this.profile.displayName)}" autocomplete="nickname"></label><p class="profile-hint">2–24 letters, numbers, spaces, dashes or underscores. This is the name shown on the Beard Board.</p><div class="account-stat"><span>CASINO WALLET</span><strong>${this.money()}</strong></div><p class="account-message" data-account-message></p><button class="primary" data-save-profile>SAVE PROFILE</button><button class="account-secondary" data-password-reset>SEND PASSWORD RESET</button><button class="account-secondary" data-signout>SIGN OUT</button><button class="cashout" data-guest>SWITCH TO GUEST MODE</button></div>`;
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
    modal.querySelector("[data-save-profile]")?.addEventListener("click", async () => {
      const input = modal.querySelector<HTMLInputElement>("[data-display-name]");
      const displayName = (input?.value ?? "").trim().replace(/\s+/g, " ");
      if (!/^[A-Za-z0-9 _-]{2,24}$/.test(displayName)) {
        status("Use 2–24 letters, numbers, spaces, dashes or underscores.");
        return;
      }
      this.profile = { ...this.profile, displayName, updatedAtIso: new Date().toISOString() };
      this.profiles.save(this.profile);
      this.accounts.saveProfile(this.profile);
      await this.accounts.flush();
      const publishError = await this.accounts.publishStats(this.profile);
      status(publishError ?? "Profile saved. The Beard Board has been refreshed.");
    });
    modal.querySelector("[data-password-reset]")?.addEventListener("click", async () => {
      status("SENDING RESET EMAIL…");
      const error = await this.accounts.resetPassword(state.email);
      status(error ?? "Password-reset email sent.");
    });
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
          await this.accounts.publishStats(cloud);
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
          await this.accounts.publishStats(cloud);
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

  private escapeAttribute(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
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
    this.currentGameId = id;
    this.telemetry.setActiveGame(id);
    this.applyUnlockedRewards();
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
    if (id === "barber") {
      new BigBadBarber(
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
