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
import { runProductionSimulation, productionSimulationCsv, type ProductionSimulationReport } from "../state/ProductionCasinoSimulation";
import { BUILD_INFO, buildFingerprint } from "../build/BuildInfo";
import { SpinReplayStore } from "../engine/replay/SpinReplayStore";
import { SpinOutcomeStore } from "../engine/outcome/SpinOutcomeStore";
import type { SpinOutcome } from "../engine/contracts/SpinOutcome";
import { FeatureExecutionPipeline } from "../engine/feature/FeatureExecutionPipeline";
import { planFeatureExecution } from "../engine/feature/SpinOutcomeFeaturePlanner";
import { cashOutCasinoWallet, ensureCasinoSession, recordEconomyActivity, redeemCasinoTicket, withdrawFromChecking, type CashoutDestination } from "../engine/economy/CasinoEconomy";
import { PremiumAnimationEngine } from "../engine/animation/PremiumAnimationEngine";

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
  private readonly replay = new SpinReplayStore();
  private readonly outcomes = new SpinOutcomeStore();
  private readonly featureExecution = new FeatureExecutionPipeline({
    observer: {
      onPlanStart: (plan) => {
        this.replay.noteCompleted("feature-pipeline-start", { planId: plan.id, outcomeId: plan.spinOutcomeId });
        window.dispatchEvent(new CustomEvent("casino:pipeline", { detail: { phase: "start", plan } }));
      },
      onStepStart: ({ plan, step }) => {
        this.replay.noteCompleted("feature-pipeline-step", {
          planId: plan.id,
          stepId: step.id,
          kind: step.kind,
          label: step.label,
        });
        window.dispatchEvent(new CustomEvent("casino:pipeline", { detail: { phase: "step", planId: plan.id, step } }));
      },
      onPlanComplete: (plan) => {
        this.replay.noteCompleted("feature-pipeline-complete", { planId: plan.id });
        window.dispatchEvent(new CustomEvent("casino:pipeline", { detail: { phase: "complete", plan } }));
      },
      onError: (plan, step, error) => {
        console.error("Feature execution observer failed.", { plan, step, error });
      },
    },
  });
  private currentGameId: GameId | "lobby" = "lobby";

  public async initialize(): Promise<void> {
    this.installBuildFingerprint();
    this.installDeveloperPanel();
    window.addEventListener("casino:state", (event) => {
      const detail = (event as CustomEvent<{ game?: string; state?: string }>).detail;
      if (detail?.state) {
        this.telemetry.setState(detail.state);
        const outcome = detail.game === "barber" ? null : this.outcomes.recordState(detail.state);
        this.replay.recordState(detail.state);
        if (outcome) this.acceptOutcome(outcome);
      }
    });
    window.addEventListener("casino:direct-outcome", (event) => {
      const outcome = (event as CustomEvent<SpinOutcome>).detail;
      if (!outcome || outcome.schemaVersion !== 1) return;
      this.outcomes.acceptOutcome(outcome);
      this.acceptOutcome(outcome);
    });
    this.installSoundControl();
    this.audio.startAmbience("lobby");
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

  private installBuildFingerprint(): void {
    document.querySelector("[data-build-fingerprint]")?.remove();
    const footer = document.createElement("aside");
    footer.className = "build-fingerprint";
    footer.dataset.buildFingerprint = "true";
    footer.title = `Branch ${BUILD_INFO.branch} • Built ${BUILD_INFO.builtAt}`;
    footer.innerHTML = `<b>${BUILD_INFO.version}</b><span>${BUILD_INFO.commit}</span><i>${BUILD_INFO.mathMode}</i>`;
    document.body.appendChild(footer);
  }

  private downloadLastReplay(): boolean {
    this.replay.finishActive();
    const json = this.replay.exportLast();
    if (!json) return false;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `beard-laws-replay-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    return true;
  }

  private installSoundControl(): void {
    const button = document.createElement("button");
    button.className = "sound-toggle";
    button.textContent = "⚙ EXPERIENCE";
    const applyMotion = (): void => {
      document.documentElement.classList.toggle(
        "reduced-motion",
        localStorage.getItem("beard-laws-casino-motion") === "reduced",
      );
    };
    applyMotion();
    button.addEventListener("click", () => {
      const modal = document.createElement("div");
      modal.className = "modal-backdrop";
      const render = (): void => {
        const reduced = localStorage.getItem("beard-laws-casino-motion") === "reduced";
        const turbo = localStorage.getItem("beard-laws-casino-turbo") === "on";
        const master = Math.round(this.audio.getVolume() * 100);
        const effects = Math.round(this.audio.getEffectsVolume() * 100);
        const ambience = Math.round(this.audio.getAmbienceVolume() * 100);
        modal.innerHTML = `<div class="atm-modal experience-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • ${buildFingerprint()}</small><h2>Experience Settings</h2><div class="experience-grid"><button data-sound>SOUND <b>${this.audio.isEnabled()?"ON":"OFF"}</b></button><button data-haptics>HAPTICS <b>${this.audio.isHapticsEnabled()?"ON":"OFF"}</b></button><button data-turbo>TURBO <b>${turbo?"ON":"OFF"}</b></button><button data-motion>MOTION <b>${reduced?"REDUCED":"FULL"}</b></button></div><label class="volume-control"><span>MASTER</span><input data-volume="master" type="range" min="0" max="100" value="${master}"><b>${master}%</b></label><label class="volume-control"><span>GAME EFFECTS</span><input data-volume="effects" type="range" min="0" max="100" value="${effects}"><b>${effects}%</b></label><label class="volume-control"><span>CASINO AMBIENCE</span><input data-volume="ambience" type="range" min="0" max="100" value="${ambience}"><b>${ambience}%</b></label><p>Each cabinet now has its own ambient audio personality. Reduced Motion removes nonessential celebration movement.</p></div>`;
        modal.querySelector("[data-close]")?.addEventListener("click",()=>modal.remove());
        modal.querySelector("[data-sound]")?.addEventListener("click",()=>{this.audio.toggle();render();});
        modal.querySelector("[data-haptics]")?.addEventListener("click",()=>{this.audio.toggleHaptics();render();});
        modal.querySelector("[data-turbo]")?.addEventListener("click",()=>{localStorage.setItem("beard-laws-casino-turbo",turbo?"off":"on");render();});
        modal.querySelector("[data-motion]")?.addEventListener("click",()=>{localStorage.setItem("beard-laws-casino-motion",reduced?"full":"reduced");applyMotion();render();});
        modal.querySelectorAll<HTMLInputElement>("[data-volume]").forEach((slider) => slider.addEventListener("input", () => {
          const value = Number(slider.value) / 100;
          if (slider.dataset.volume === "master") this.audio.setVolume(value);
          if (slider.dataset.volume === "effects") this.audio.setEffectsVolume(value);
          if (slider.dataset.volume === "ambience") this.audio.setAmbienceVolume(value);
          const label = slider.parentElement?.querySelector("b"); if (label) label.textContent = `${slider.value}%`;
        }));
      };
      render(); document.body.appendChild(modal);
    });
    document.body.appendChild(button);
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
    let lastAnimationCue = "IDLE";
    host.innerHTML = `<button class="dev-tools-toggle" data-dev-toggle title="Casino QA tools">QA</button><section data-dev-panel hidden><header><strong>PROJECT BEARD DEV SUITE • ${BUILD_INFO.version}</strong><button data-dev-close>×</button></header>
      <div class="dev-active"><span>ACTIVE CABINET</span><b data-dev-active>LOBBY</b><i data-dev-state>READY</i><em data-dev-animation>ANIMATION: IDLE</em></div>
      <div class="dev-status" data-dev-status>QA ready. Open a cabinet, then trigger a test.</div>
      <div class="dev-telemetry" data-dev-summary></div><div class="dev-telemetry-table" data-dev-table></div>
      <div class="dev-qa-row"><label>ANIMATION SPEED<select data-dev-speed><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label><label><input type="checkbox" data-dev-close-after> CLOSE AFTER TRIGGER</label><button data-dev-pause>PAUSE ANIMATIONS</button><button data-dev-reset-telemetry>RESET TELEMETRY</button><button data-dev-math-all>RUN ACTUAL CABINET MATH</button><button data-dev-replay>EXPORT LAST REPLAY</button></div>
      <small>BEARD BANK</small><div class="dev-grid">${actions([["vault-heist","Vault Heist"],["free-spins","Free Spins"],["living-vault","Living Vault"],["vault-mini","Mini Coin"],["vault-minor","Minor Coin"],["vault-major","Major Coin"],["vault-grand","Grand Coin"],["vault-full","Full Vault"],["math-report","1M Math Report"]])}</div>
      <small>BIG BAD BARBER</small><div class="dev-grid">${actions([["barber-builder","Force Builder Upgrade"],["barber-bonus","Force Shave Down"],["barber-attack","Force Barber Attack"],["barber-two-razors","Two-Razor Near Miss"],["barber-three-razors","Force 3 Razors Next Spin"],["barber-max-forts","Max Fortresses"]])}</div>
      <small>MEGH'S COSMIC JAM</small><div class="dev-grid">${actions([["megh-goat","Goat Stampede"],["megh-ufo","UFO Scan"],["megh-encore","Force Encore"],["megh-headliner","Headliner Mode"]])}</div>
      <small>NEEMA'S HIGH SEAS</small><div class="dev-grid">${actions([["neema-feature","Frozen Happy Hour"],["neema-captain","Captain Moment"],["neema-tickets","Three Tickets"],["neema-voyage","Final Voyage"]])}</div>
      <small>ROULETTE • FORCE NEXT RESULT</small><div class="dev-result"><select data-dev-result><option>0</option><option>00</option>${Array.from({ length: 36 }, (_, i) => `<option>${i + 1}</option>`).join("")}</select><button data-dev-action="roulette-result" data-game="roulette">ARM RESULT</button></div>
      <p>QA actions never alter production math. They only arm the matching active cabinet.</p><p class="dev-build">${buildFingerprint()} • ${BUILD_INFO.branch} • ${BUILD_INFO.builtAt}</p></section>`;
    document.body.appendChild(host);
    const panel = host.querySelector<HTMLElement>("[data-dev-panel]")!;
    const status = host.querySelector<HTMLElement>("[data-dev-status]")!;
    const setStatus = (text: string, tone: "ok" | "error" | "running" = "ok"): void => { status.textContent = text; status.className = `dev-status ${tone}`; };
    const refresh = (): void => {
      const snap = this.telemetry.snapshot();
      host.querySelector<HTMLElement>("[data-dev-active]")!.textContent = this.currentGameId.toUpperCase();
      host.querySelector<HTMLElement>("[data-dev-state]")!.textContent = snap.gameState;
      const animation = host.querySelector<HTMLElement>("[data-dev-animation]");
      if (animation) animation.textContent = `ANIMATION: ${lastAnimationCue}`;
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
    host.querySelector("[data-dev-replay]")?.addEventListener("click", () => {
      const available = this.downloadLastReplay();
      setStatus(available ? "Replay exported." : "No completed spin replay is available yet.", available ? "ok" : "error");
    });
    host.querySelector("[data-dev-math-all]")?.addEventListener("click", () => { setStatus("Running production-rule simulations for Barber, Megh, and Neema…", "running"); panel.hidden = true; this.showCasinoMathReport(); });
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
    window.addEventListener("casino:animation", (event) => {
      const detail = (event as CustomEvent<{ cue?: string; game?: string }>).detail;
      lastAnimationCue = `${(detail?.game ?? this.currentGameId).toUpperCase()} • ${(detail?.cue ?? "UNKNOWN").toUpperCase()}`;
      refresh();
    });
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

  private showCasinoMathReport(): void {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `<section class="progress-modal casino-math-modal"><small>PROJECT BEARD M13 • PRODUCTION MATH</small><h2>Running 100,000 production-rule spins…</h2><p>The lab is using the same symbol weights, pay rules, triggers, persistent meters, fortress values, cascade rules, and bonus limits used by the playable cabinets.</p></section>`;
    document.body.appendChild(modal);
    window.setTimeout(() => {
      const reports: ProductionSimulationReport[] = [
        runProductionSimulation("barber", 100000, 7702),
        runProductionSimulation("megh", 100000, 7702),
        runProductionSimulation("neema", 100000, 7702),
      ];
      const oneIn = (frequency: number): string => frequency > 0 ? `1 in ${(1 / frequency).toFixed(1)}` : "Not observed";
      modal.innerHTML = `<section class="progress-modal casino-math-modal"><button class="close" data-close>×</button><small>PROJECT BEARD M13 • PRODUCTION RULE LAB</small><h2>Actual Cabinet Math Report</h2><div class="math-cards">${reports.map((report) => `<article><h3>${report.game.toUpperCase()}</h3><p><span>RULE-SET RTP</span><b>${(report.rtp * 100).toFixed(2)}%</b></p><p><span>BASE / FEATURE</span><b>${(report.baseRtp * 100).toFixed(1)}% / ${(report.featureRtp * 100).toFixed(1)}%</b></p><p><span>ANY WIN</span><b>${(report.hitFrequency * 100).toFixed(1)}%</b></p><p><span>WIN ≥ BET</span><b>${(report.profitableFrequency * 100).toFixed(1)}%</b></p><p><span>FEATURE</span><b>${oneIn(report.featureFrequency)}</b></p><p><span>AVG / MEDIAN FEATURE</span><b>${report.averageFeatureX.toFixed(1)}× / ${report.medianFeatureX.toFixed(1)}×</b></p><p><span>MAX OBSERVED</span><b>${report.maxWinX.toFixed(1)}×</b></p><p><span>LONGEST FEATURE DROUGHT</span><b>${report.longestFeatureDrought}</b></p><p><span>NEAR MISS</span><b>${(report.nearMissFrequency * 100).toFixed(2)}%</b></p><p><span>VOLATILITY INDEX</span><b>${report.volatility.toFixed(2)}</b></p></article>`).join("")}</div><p class="math-disclaimer"><b>These are now production-rule simulations.</b> They directly import each cabinet's live symbol weights and constants. Interactive player choices are simulated uniformly and presentation-only events are excluded. Target band for the flagship cabinets is 95–96% RTP. They are engineering reports, not regulatory certification.</p><div class="math-actions"><button class="primary" data-download-math>DOWNLOAD ACTUAL CSV</button><button class="account-secondary" data-run-million>RUN 1,000,000 EACH</button><button class="account-secondary" data-beardbank-math>RUN BEARD BANK 1M</button><button class="account-secondary" data-close>RETURN</button></div></section>`;
      modal.querySelectorAll("[data-close]").forEach((node) => node.addEventListener("click", () => modal.remove()));
      modal.querySelector("[data-beardbank-math]")?.addEventListener("click", () => { modal.remove(); this.showMathReport(); });
      modal.querySelector("[data-download-math]")?.addEventListener("click", () => {
        const blob = new Blob([productionSimulationCsv(reports)], { type: "text/csv" });
        const anchor = document.createElement("a");
        anchor.href = URL.createObjectURL(blob);
        anchor.download = "beard-laws-casino-m13-production-math.csv";
        anchor.click();
        URL.revokeObjectURL(anchor.href);
      });
      modal.querySelector("[data-run-million]")?.addEventListener("click", () => {
        modal.innerHTML = `<section class="progress-modal casino-math-modal"><small>PROJECT BEARD M13 • DEEP RUN</small><h2>Running 3,000,000 production-rule spins…</h2><p>This can take several seconds. The casino accountant has requested snacks.</p></section>`;
        window.setTimeout(() => {
          const million = [runProductionSimulation("barber", 1000000, 7712), runProductionSimulation("megh", 1000000, 7712), runProductionSimulation("neema", 1000000, 7712)];
          const blob = new Blob([productionSimulationCsv(million)], { type: "text/csv" });
          const anchor = document.createElement("a");
          anchor.href = URL.createObjectURL(blob);
          anchor.download = "beard-laws-casino-m13-production-math-1m.csv";
          anchor.click();
          URL.revokeObjectURL(anchor.href);
          modal.remove();
        }, 50);
      });
    }, 40);
  }

  private saveWallet(units: number): void {
    this.walletUnits = Math.max(0, Math.round(units));
    this.profile = {
      ...this.profile,
      walletUnits: this.walletUnits,
      updatedAtIso: new Date().toISOString(),
    };
    this.persistProfile();
  }

  private persistProfile(): void {
    this.profiles.save(this.profile);
    this.accounts.saveProfile(this.profile);
  }

  private saveEconomy(economy: PlayerProfile["economy"], walletUnits = this.walletUnits): void {
    this.walletUnits = Math.max(0, Math.round(walletUnits));
    this.profile = { ...this.profile, economy, walletUnits: this.walletUnits, updatedAtIso: new Date().toISOString() };
    this.persistProfile();
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
    const completedOutcome = activity.game === "barber" ? null : this.outcomes.recordActivity(activity);
    if (completedOutcome) this.acceptOutcome(completedOutcome);
    this.replay.recordActivity(activity);
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
    const economy = recordEconomyActivity(this.profile.economy, this.walletUnits, activity);
    this.profile = { ...this.profile, walletUnits, casino, economy, updatedAtIso: new Date().toISOString() };
    this.persistProfile();
    if (activity.type === "win" && (activity.amount ?? 0) > 0) {
      const multiplier = (activity.wager ?? 0) > 0 ? (activity.amount ?? 0) / (activity.wager ?? 1) : (activity.value ?? 0);
      if (multiplier >= 5) {
        const cabinet = this.appRoot.querySelector<HTMLElement>(".barber-game,.megh-game,.neema-game,.beard-bank-dom,.cabinet");
        if (cabinet) void new PremiumAnimationEngine(cabinet, activity.game).celebrateWin(multiplier);
      }
    }
  }

  private acceptOutcome(outcome: SpinOutcome): void {
    this.replay.attachOutcome(outcome);
    window.dispatchEvent(new CustomEvent("casino:outcome", { detail: outcome }));
    const plan = planFeatureExecution(outcome);
    void this.featureExecution.enqueue(plan).catch((error: unknown) => {
      console.error("Feature execution plan failed.", error);
    });
  }

  private applyUnlockedRewards(): void {
    const rewardClasses = ["skin-gold-barber", "goat-golden", "skin-neema-moon", "vault-royal", "spin-beard-burst", "barber-angry", "captain-gala"];
    rewardClasses.forEach((reward) => document.body.classList.toggle(`reward-${reward}`, this.profile.casino.unlockedRewards.includes(reward)));
  }

  private showLobby(): void {
    this.currentGameId = "lobby";
    this.audio.startAmbience("lobby");
    this.telemetry.setActiveGame("lobby");
    this.applyUnlockedRewards();
    this.destroyPixi();
    const rank = rankForXp(this.profile.casino.xp);
    const rankPercent = rank.next > this.profile.casino.xp ? Math.min(100, Math.round((this.profile.casino.xp / rank.next) * 100)) : 100;
    const completed = this.profile.casino.missions.filter((mission) => mission.progress >= mission.target).length;
    this.appRoot.innerHTML = `
      <section class="casino-shell">
        <header class="casino-header"><div><span class="eyebrow">WELCOME TO</span><h1>BEARD LAWS CASINO</h1></div><div class="player-cluster"><button class="profile-button" data-profile><small>${this.accounts.state().session ? "PLAYER CARD INSERTED" : "GUEST MODE"}</small><strong>${this.profile.displayName}</strong></button><button class="rank-pill" data-stats><small>${this.profile.casino.xp} REPUTATION</small><strong>${rank.name}</strong><i><span style="width:${rankPercent}%"></span></i></button><button class="wallet-pill" data-cashier><small>CASINO WALLET</small><strong>${this.money()}</strong><span>OPEN CASHIER</span></button></div></header>
        <div class="hero"><div><p class="kicker">THE HOUSE THAT BEARDS BUILT</p><h2>Your night. Your bankroll. Your game.</h2><p>Start with a fictional entertainment bankroll, chase the Beard Bank vault, or take a seat at Papa's table.</p></div><div class="hero-actions casino-money-actions"><button class="economy-hero-action atm" data-atm><small>FUND THE NIGHT</small><b>VISIT ATM</b></button><button class="economy-hero-action bank" data-bank><small>BETWEEN VISITS</small><b>BEARD LAWS BANK</b></button><button class="economy-hero-action cashier" data-cashier><small>LEAVING?</small><b>CASHIER</b></button></div></div>
        <section class="casino-dashboard v73-dashboard"><button data-bank><small>BEARD LAWS BANK</small><strong>${this.money(this.profile.economy.checkingUnits)} CHECKING</strong><span>${this.profile.economy.activeSession ? "CASINO VISIT ACTIVE" : `${this.profile.economy.sessions.length} VISITS RECORDED`}</span></button><button data-missions><small>DAILY MISSIONS</small><strong>${completed} / 3 COMPLETE</strong><span>${this.profile.casino.missions.map((m) => `<i class="${m.progress >= m.target ? "done" : ""}">${Math.min(m.progress, m.target)}/${m.target}</i>`).join("")}</span></button><button data-stats><small>CASINO PASSPORT</small><strong>${this.profile.casino.achievements.length} STAMPS EARNED</strong><span>Best ${this.profile.casino.biggestMultiplier.toFixed(1)}×</span></button><button data-leaderboard><small>CASINO LEADERBOARD</small><strong>THE BEARD BOARD</strong><span>Players • records • recent legends</span></button><button data-daily><small>DAILY BEARD PASS</small><strong>DAY ${this.profile.casino.dailyStreak} OF 7</strong><span>Return tomorrow to advance</span></button><button class="vault-button" data-vault><small>THE BEARD VAULT</small><strong>${this.profile.casino.beardChips} BEARD CHIPS</strong><span>Skins • characters • trophies</span></button></section>
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
    this.appRoot.querySelectorAll("[data-bank]").forEach((node) => node.addEventListener("click", () => this.showBank()));
    this.appRoot.querySelector("[data-cashier]")?.addEventListener("click", () => this.showCashier());
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
      modal.innerHTML = `<section class="progress-modal beard-vault-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • FAMILY META-GAME</small><h2>The Beard Vault</h2><p>Every cabinet creates family memories. Reputation never decreases; Beard Chips unlock cosmetics only and never change odds.</p><div class="vault-balance"><p><span>BEARD REPUTATION</span><b>${this.profile.casino.xp}</b></p><p><span>SPENDABLE BEARD CHIPS</span><b>${this.profile.casino.beardChips}</b></p><p><span>COLLECTION</span><b>${owned.size} / ${rewards.length}</b></p><p><span>TROPHIES</span><b>${trophies.filter((t) => unlockedTrophies.has(t.id)).length} / ${trophies.length}</b></p><p><span>DISCOVERIES</span><b>${this.profile.casino.discoveredEvents.length}</b></p></div><div class="mastery-tracks">${(["barber","megh","neema","beard-bank"] as const).map(game=>{const m=this.profile.casino.mastery[game] ?? {level:1,progress:0,claimed:[]};const pct=m.progress%100;return `<article><b>${game.replaceAll("-"," ").toUpperCase()}</b><span>MASTERY ${m.level}</span><i><em style="width:${pct}%"></em></i><small>${pct} / 100 TO NEXT LEVEL</small></article>`;}).join("")}</div><div class="vault-tabs"><button data-vault-tab="shop" class="${tab === "shop" ? "primary" : "account-secondary"}">REWARD SHOP</button><button data-vault-tab="trophies" class="${tab === "trophies" ? "primary" : "account-secondary"}">FAMILY TROPHY ROOM</button></div>${tab === "shop" ? `<div class="vault-shop">${rewards.map((reward) => `<button class="vault-item ${owned.has(reward.id) ? "owned" : ""}" data-reward="${reward.id}" ${owned.has(reward.id) ? "disabled" : ""}><i>${reward.icon}</i><small>${reward.category}</small><strong>${reward.name}</strong><span>${reward.copy}</span><b>${owned.has(reward.id) ? "OWNED" : `${reward.cost} CHIPS`}</b></button>`).join("")}</div><p class="vault-note">Features award Chips. Daily missions, rare wins, and future family challenges add more. Cosmetics never change RTP.</p>` : `<div class="trophy-room">${trophies.map((trophy) => { const unlocked = unlockedTrophies.has(trophy.id); return `<article class="trophy-card ${unlocked ? "" : "locked"}"><i>${unlocked ? trophy.icon : "?"}</i><b>${trophy.name}</b><span>${unlocked ? trophy.copy : "Keep playing to discover this trophy."}</span></article>`; }).join("")}</div>`}<button class="primary" data-close>RETURN TO CASINO</button></section>`;
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
      modal.innerHTML = `<div class="atm-modal account-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • V76</small><h2>Player Account</h2><p>${state.connected ? "Sign in to restore your private cloud wallet." : "Cloud accounts need the Supabase connection in your .env file before building."}</p><p class="account-message" data-account-message>${message}</p><label>Email<input data-email type="email" autocomplete="email"></label><label>Password<input data-password type="password" minlength="6" autocomplete="current-password"></label><button class="primary" data-signin ${state.connected ? "" : "disabled"}>SIGN IN</button><button class="account-secondary" data-signup ${state.connected ? "" : "disabled"}>CREATE ACCOUNT</button><button class="cashout" data-reset ${state.connected ? "" : "disabled"}>FORGOT PASSWORD</button></div>`;
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
    const render = (message = ""): void => {
      modal.innerHTML = `<div class="atm-modal economy-modal"><button class="close" data-close>×</button><small>BEARD LAWS CASINO • ATM</small><h2>Fund this casino visit</h2><div class="economy-balance-grid"><p><span>CHECKING</span><strong>${this.money(this.profile.economy.checkingUnits)}</strong></p><p><span>CASINO WALLET</span><strong>${this.money()}</strong></p></div><p class="economy-note">Fictional entertainment money only. ATM withdrawals move credits from your Beard Laws Bank checking account into the casino wallet.</p><div class="amounts">${[10000,20000,30000,50000].map((v) => `<button data-amount="${v}">${this.money(v)}</button>`).join("")}</div><label>Custom amount ($)<input data-custom type="number" min="1" max="10000" value="200"></label><p class="atm-fee">ATM FEE <b>$3.99</b></p><p class="account-message">${message}</p><button class="cashout" data-cashier>GO TO CASHIER</button></div>`;
      modal.querySelector("[data-close]")?.addEventListener("click", () => modal.remove());
      modal.querySelector("[data-cashier]")?.addEventListener("click", () => { modal.remove(); this.showCashier(); });
      const withdraw = (amount: number): void => {
        try {
          const result = withdrawFromChecking(this.profile.economy, this.walletUnits, amount, 399);
          this.audio.cue("atm"); this.saveEconomy(result.state, result.walletUnits); render(`${this.money(amount)} moved to the casino wallet. Fee ${this.money(result.feeUnits)}.`);
        } catch (error) { render(error instanceof Error ? error.message : "ATM transaction failed."); }
      };
      modal.querySelectorAll<HTMLElement>("[data-amount]").forEach((button) => button.addEventListener("click", () => withdraw(Number(button.dataset.amount))));
      modal.querySelector<HTMLInputElement>("[data-custom]")?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return; withdraw(Math.round(Number((event.currentTarget as HTMLInputElement).value) * 100));
      });
    };
    render(); document.body.appendChild(modal);
  }

  private showBank(): void {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    const render = (message = ""): void => {
      const economy = this.profile.economy;
      const openTickets = economy.tickets.filter((ticket) => !ticket.redeemedAtIso);
      const recent = [...economy.sessions].reverse().slice(0, 3);
      const sessions = economy.sessions;
      const lifetimeResult = sessions.reduce((sum, session) => sum + session.resultUnits, 0);
      const totalWagered = sessions.reduce((sum, session) => sum + session.totalWageredUnits, 0);
      const totalWon = sessions.reduce((sum, session) => sum + session.totalWonUnits, 0);
      const biggestWin = sessions.reduce((max, session) => Math.max(max, session.biggestWinUnits), 0);
      const winningVisits = sessions.filter((session) => session.resultUnits > 0).length;
      const active = economy.activeSession;
      const activeResult = active
        ? this.walletUnits - active.startingWalletUnits - active.atmWithdrawalsUnits - active.atmFeesUnits
        : 0;
      const gameLabel = (game: string): string => game === "barber"
        ? "BIG BAD BARBER"
        : game === "megh"
          ? "MEGH'S COSMIC JAM"
          : game === "neema"
            ? "NEEMA'S HIGH SEAS"
            : game === "beard-bank"
              ? "BEARD BANK"
              : game === "none"
                ? "CASINO VISIT"
                : game.replaceAll("-", " ").toUpperCase();
      const openTicketValue = openTickets.reduce((sum, ticket) => sum + ticket.valueUnits, 0);

      modal.innerHTML = `<section class="atm-modal bank-modal casino-destination-modal economy-destination-v2">
        <button class="close" data-close aria-label="Close">×</button>
        <header class="economy-modal-header compact"><small>BEARD LAWS BANK • FICTIONAL ACCOUNTS</small><h2>Beard Laws Bank</h2><p>Your money between casino visits. Clean, simple, and still a terrible place to ask for investment advice.</p></header>

        <div class="economy-account-strip">
          <article><small>CHECKING</small><strong>${this.money(economy.checkingUnits)}</strong><span>ATM funding source</span></article>
          <article><small>SAVINGS</small><strong>${this.money(economy.savingsUnits)}</strong><span>Park fictional winnings</span></article>
          <article class="wallet"><small>CASINO WALLET</small><strong>${this.money()}</strong><span>${active ? "Visit active" : "No active visit"}</span></article>
          <article class="tickets"><small>OPEN TICKETS</small><strong>${this.money(openTicketValue)}</strong><span>${openTickets.length} waiting</span></article>
        </div>

        ${active ? `<section class="economy-tonight-card"><div><small>TONIGHT'S VISIT</small><h3>${active.spins} spins • ${active.features} features</h3><p>Started ${this.money(active.startingWalletUnits)} • Wagered ${this.money(active.totalWageredUnits)} • Wins ${this.money(active.totalWonUnits)}</p></div><strong class="${activeResult >= 0 ? "positive" : "negative"}">${activeResult >= 0 ? "+" : ""}${this.money(activeResult)}</strong></section>` : `<section class="economy-tonight-card idle"><div><small>NO ACTIVE VISIT</small><h3>Ready for the next casino night.</h3><p>Use the ATM when you are ready to put fictional credits into play.</p></div></section>`}

        <div class="economy-primary-actions">
          <button class="economy-action primary" data-atm><b>VISIT ATM</b><small>Move checking → casino wallet</small></button>
          <button class="economy-action" data-cashier ${this.walletUnits<=0?"disabled":""}><b>GO TO CASHIER</b><small>Settle this casino visit</small></button>
        </div>
        ${message ? `<p class="account-message economy-message">${message}</p>` : ""}

        <section class="bank-section compact-section"><div class="bank-section-heading"><h3>Outstanding Tickets</h3><span>${openTickets.length}</span></div><div class="ticket-list compact-ticket-list">${openTickets.length ? openTickets.map((ticket) => `<article><div><small>TICKET OUT</small><b>${ticket.id}</b><time>${new Date(ticket.issuedAtIso).toLocaleString()}</time></div><strong>${this.money(ticket.valueUnits)}</strong><div class="ticket-actions"><button data-redeem="${ticket.id}" data-destination="checking">CHECKING</button><button data-redeem="${ticket.id}" data-destination="savings">SAVINGS</button></div></article>`).join("") : `<div class="bank-empty-state"><b>No outstanding tickets.</b><span>Print one at the cashier if you want to leave with a ticket instead of depositing immediately.</span></div>`}</div></section>

        <section class="bank-section compact-section"><div class="bank-section-heading"><h3>Recent Casino Visits</h3><span>Last ${recent.length}</span></div><div class="session-history economy-visit-cards">${recent.length ? recent.map((session) => `<article class="${session.resultUnits >= 0 ? "win" : "loss"}"><div class="visit-main"><small>${new Date(session.endedAtIso).toLocaleDateString()} • ${new Date(session.endedAtIso).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</small><strong>${gameLabel(session.favoriteGame)}</strong><span>${session.spins} spins • ${session.features} features • biggest ${this.money(session.biggestWinUnits)}</span></div><div class="visit-money"><small>${this.money(session.startingWalletUnits)} → ${this.money(session.endingWalletUnits)}</small><b class="session-result ${session.resultUnits >= 0 ? "positive" : "negative"}">${session.resultUnits >= 0 ? "+" : ""}${this.money(session.resultUnits)}</b></div></article>`).join("") : `<div class="bank-empty-state"><b>No completed casino visits yet.</b><span>Your first cashout will create the first entry.</span></div>`}</div></section>

        <details class="casino-stats-drawer"><summary>VIEW LIFETIME CASINO STATS <span>${sessions.length} visits</span></summary><div class="bank-stat-grid"><p><small>LIFETIME RESULT</small><b class="${lifetimeResult >= 0 ? "positive" : "negative"}">${lifetimeResult >= 0 ? "+" : ""}${this.money(lifetimeResult)}</b></p><p><small>WINNING VISITS</small><b>${winningVisits}/${sessions.length}</b></p><p><small>TOTAL WAGERED</small><b>${this.money(totalWagered)}</b></p><p><small>RECORDED WINS</small><b>${this.money(totalWon)}</b></p><p><small>BIGGEST WIN</small><b>${this.money(biggestWin)}</b></p><p><small>ATM FEES</small><b>${this.money(economy.lifetimeAtmFeesUnits)}</b></p></div></details>

        <p class="economy-note economy-disclaimer">All balances, tickets, winnings and losses are fictional entertainment credits with no cash value.</p>
      </section>`;
      modal.querySelector("[data-close]")?.addEventListener("click",()=>modal.remove());
      modal.querySelector("[data-atm]")?.addEventListener("click",()=>{modal.remove();this.showAtm();});
      modal.querySelector("[data-cashier]")?.addEventListener("click",()=>{modal.remove();this.showCashier();});
      modal.querySelectorAll<HTMLElement>("[data-redeem]").forEach((button)=>button.addEventListener("click",()=>{
        try {
          const next=redeemCasinoTicket(this.profile.economy,String(button.dataset.redeem),button.dataset.destination === "savings" ? "savings" : "checking");
          this.audio.cue("bank");
          this.saveEconomy(next);
          render(`Ticket ${button.dataset.redeem} redeemed to ${button.dataset.destination}.`);
        } catch(error) {
          render(error instanceof Error?error.message:"Ticket could not be redeemed.");
        }
      }));
    };
    render();
    document.body.appendChild(modal);
  }

  private showCashier(): void {
    const modal=document.createElement("div");
    modal.className="modal-backdrop";
    if(!this.profile.economy.activeSession && this.walletUnits>0){
      this.saveEconomy(ensureCasinoSession(this.profile.economy,this.walletUnits));
    }
    const session=this.profile.economy.activeSession;
    const tripResult=session ? this.walletUnits-session.startingWalletUnits-session.atmWithdrawalsUnits-session.atmFeesUnits : 0;
    const canCashOut=this.walletUnits>0;
    modal.innerHTML=`<section class="atm-modal cashier-modal casino-destination-modal economy-destination-v2 cashier-v2">
      <button class="close" data-close aria-label="Close">×</button>
      <header class="economy-modal-header compact"><small>BEARD LAWS CASINO • CASHIER CAGE</small><h2>${session?"Cash Out This Visit":"Cashier"}</h2><p>${session?"One decision: bank it, save it, ticket it, or keep playing.":"Your casino wallet is empty. Visit the ATM when you are ready for another run."}</p></header>

      <section class="cashier-hero-balance"><small>CASINO WALLET</small><strong>${this.money()}</strong><span>${session?`${session.spins} spins • ${session.features} features this visit`:"No active casino visit"}</span>${session?`<b class="${tripResult>=0?"positive":"negative"}">${tripResult>=0?"+":""}${this.money(tripResult)} THIS VISIT</b>`:""}</section>

      ${session?`<details class="cashier-trip-details"><summary>VIEW VISIT DETAILS</summary><div class="cashier-ledger compact-ledger"><p><span>STARTED</span><b>${this.money(session.startingWalletUnits)}</b></p><p><span>ATM ADDED</span><b>${this.money(session.atmWithdrawalsUnits)}</b></p><p><span>ATM FEES</span><b>-${this.money(session.atmFeesUnits)}</b></p><p><span>WAGERED</span><b>${this.money(session.totalWageredUnits)}</b></p><p><span>RECORDED WINS</span><b>${this.money(session.totalWonUnits)}</b></p><p><span>BIGGEST WIN</span><b>${this.money(session.biggestWinUnits)}</b></p></div></details>`:`<div class="bank-empty-state cashier-empty"><b>No chips on the rail.</b><span>There is nothing to cash out yet.</span></div>`}

      <div class="cashier-destination-grid">
        <button class="cashout-destination primary checking" data-cashout="checking" ${canCashOut?"":"disabled"}><span>1</span><div><b>CHECKING</b><small>Deposit the full wallet</small></div></button>
        <button class="cashout-destination savings" data-cashout="savings" ${canCashOut?"":"disabled"}><span>2</span><div><b>SAVINGS</b><small>Put the night away</small></div></button>
        <button class="cashout-destination ticket" data-cashout="ticket" ${canCashOut?"":"disabled"}><span>3</span><div><b>PRINT TICKET</b><small>Keep a fictional TITO ticket</small></div></button>
        <button class="cashout-destination keep" data-close><span>↩</span><div><b>KEEP PLAYING</b><small>Return to the casino floor</small></div></button>
      </div>
      <button class="cashier-bank-link" data-bank>OPEN BEARD LAWS BANK</button>
      <p class="economy-note economy-disclaimer">Fictional entertainment credits only • No real-world cash value.</p>
    </section>`;
    modal.querySelectorAll("[data-close]").forEach((node)=>node.addEventListener("click",()=>modal.remove()));
    modal.querySelector("[data-bank]")?.addEventListener("click",()=>{modal.remove();this.showBank();});
    modal.querySelectorAll<HTMLElement>("[data-cashout]").forEach((button)=>button.addEventListener("click",()=>{
      if(!canCashOut)return;
      const destination=(button.dataset.cashout??"checking") as CashoutDestination;
      button.setAttribute("disabled","");
      button.classList.add("cashout-processing");
      const result=cashOutCasinoWallet(this.profile.economy,this.walletUnits,destination);
      this.audio.cue(destination === "ticket" ? "ticket" : "cashier");
      this.saveEconomy(result.state,result.walletUnits);
      window.setTimeout(()=>{
        modal.remove();
        if(result.ticket)this.showTicket(result.ticket.id);
        else this.showLobby();
      },420);
    }));
    document.body.appendChild(modal);
  }

  private showTicket(ticketId: string): void {
    const ticket=this.profile.economy.tickets.find((item)=>item.id===ticketId); if(!ticket){this.showBank();return;}
    const modal=document.createElement("div"); modal.className="modal-backdrop";
    modal.innerHTML=`<section class="tito-modal"><small>BEARD LAWS CASINO</small><h2>TICKET OUT</h2><strong>${this.money(ticket.valueUnits)}</strong><div class="ticket-barcode" aria-hidden="true"></div><p>${ticket.id}</p><time>${new Date(ticket.issuedAtIso).toLocaleString()}</time><b>FICTIONAL • NO CASH VALUE</b><div><button data-print>PRINT</button><button data-bank>GO TO BANK</button><button data-close>RETURN TO CASINO</button></div></section>`;
    modal.querySelector("[data-print]")?.addEventListener("click",()=>window.print()); modal.querySelector("[data-bank]")?.addEventListener("click",()=>{modal.remove();this.showBank();}); modal.querySelector("[data-close]")?.addEventListener("click",()=>{modal.remove();this.showLobby();});
    document.body.appendChild(modal);
  }

  private openGame(id: GameId): void {
    if (this.walletUnits <= 0) {
      this.showAtm();
      return;
    }
    this.currentGameId = id;
    this.telemetry.setActiveGame(id);
    if (!this.profile.economy.activeSession) this.saveEconomy(ensureCasinoSession(this.profile.economy, this.walletUnits));
    this.audio.startAmbience(id === "barber" ? "barber" : id === "megh" ? "megh" : id === "neema" ? "neema" : id === "beard-bank" ? "beard-bank" : "tables");
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
