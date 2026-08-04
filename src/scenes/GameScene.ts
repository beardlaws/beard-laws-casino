import { Application as PixiApplication, Container } from "pixi.js";
import { FeaturePipeline } from "../engine/FeaturePipeline";
import { CryptoRandomSource } from "../engine/CryptoRandomSource";
import { ReelGenerator } from "../engine/ReelGenerator";
import { SpinCoordinator } from "../engine/SpinCoordinator";
import { WalletManager } from "../engine/WalletManager";
import { WaysEvaluator } from "../engine/WaysEvaluator";
import {
  beardBankConfig,
  beardBankSpinMetadataFactory,
  initialBeardBankGameState,
  type BeardBankGameState,
  type BeardBankSpinMetadata,
} from "../games/BeardBank/BeardBankConfig";
import { Cabinet } from "../graphics/Cabinet";
import { formatCreditUnits } from "../types/Money";

const BET_LEVELS = [50, 100, 200, 300, 500, 1000] as const;

export class GameScene {
  private readonly root = new Container();
  private readonly cabinet = new Cabinet();
  private readonly wallet: WalletManager;
  private readonly coordinator: SpinCoordinator<BeardBankGameState, BeardBankSpinMetadata>;
  private readonly bonusReelGenerator = new ReelGenerator(new CryptoRandomSource());
  private readonly bonusWaysEvaluator = new WaysEvaluator();

  private gameState = initialBeardBankGameState;
  private isSpinning = false;
  private betIndex = 1;
  private autoSpinsRemaining: number | "infinite" | null = null;
  private autoStopRequested = false;

  public constructor(
    private readonly app: PixiApplication,
    initialWalletUnits = 20_000,
    initialProgress: Pick<BeardBankGameState, "livingVaultCharges" | "lifetimeCoinsCollected"> = initialBeardBankGameState,
    private readonly onBalanceChange: (units: number) => void = () => {},
    private readonly onProgressChange: (charges: number, lifetimeCoins: number) => void = () => {},
    private readonly onExit: () => void = () => {},
  ) {
    this.gameState = { ...initialBeardBankGameState, ...initialProgress };
    this.wallet = new WalletManager(
      { bankUnits: 0, casinoWalletUnits: initialWalletUnits },
      { createTransactionId: () => crypto.randomUUID(), now: () => new Date() },
    );
    this.coordinator = new SpinCoordinator<BeardBankGameState, BeardBankSpinMetadata>(
      this.wallet,
      new ReelGenerator(new CryptoRandomSource()),
      new WaysEvaluator(),
      new FeaturePipeline([]),
      beardBankSpinMetadataFactory,
      beardBankConfig,
      { createSpinId: () => crypto.randomUUID() },
    );
  }

  public initialize(): void {
    this.root.addChild(this.cabinet);
    this.app.stage.addChild(this.root);
    this.cabinet.onSpin(() => { void this.handleSpin(); });
    this.cabinet.onAutoSelect((spins) => this.handleAutoSelection(spins));
    this.cabinet.onHome(() => this.exitToLobby());
    this.cabinet.onInfo(() => this.cabinet.toggleRules());
    this.cabinet.onBetMinus(() => this.changeBet(-1));
    this.cabinet.onBetPlus(() => this.changeBet(1));
    this.cabinet.setVaultCharge(this.gameState.livingVaultCharges);
    this.refreshWalletDisplay();
    this.resize(this.app.renderer.width, this.app.renderer.height);
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("casino:dev", this.handleDeveloperAction as EventListener);
  }

  private readonly handleDeveloperAction = (event: CustomEvent<{ action: string }>): void => {
    if (this.isSpinning) return;
    const action = event.detail.action;
    if (["vault-heist", "free-spins", "living-vault", "vault-mini", "vault-minor", "vault-major", "vault-grand", "vault-full"].includes(action)) void this.runForcedFeature(action);
  };

  private async runForcedFeature(action: string): Promise<void> {
    this.isSpinning = true; this.refreshBetControls();
    const wagerUnits = BET_LEVELS[this.betIndex]!;
    let award = 0;
    try {
      if (action === "vault-heist") award = await this.cabinet.playVaultHeist(wagerUnits, 5);
      else if (action === "free-spins") award = await this.runVernonFreeSpins(wagerUnits, 3);
      else {
        const jackpot = action.startsWith("vault-") && action !== "vault-full" ? action.slice(6) as "mini"|"minor"|"major"|"grand" : undefined;
        award = await this.cabinet.playLivingVaultRespin(wagerUnits, jackpot ? { jackpot } : { fullGrid: action === "vault-full" });
      }
      if (award > 0) this.wallet.award(award, { reason: `Developer test: ${action}`, metadata: { gameId: "beard-bank" } });
      this.cabinet.setWin(`$${formatCreditUnits(award)}`); this.cabinet.setStatus("TEST FEATURE PAID"); this.refreshWalletDisplay();
    } finally { this.isSpinning = false; this.refreshBetControls(); }
  }

  private runVernonFreeSpins(wagerUnits: number, triggerDoors: number): Promise<number> {
    return this.cabinet.playVernonsFreeSpins(triggerDoors, async (multiplier) => {
      const bonusGrid = this.bonusReelGenerator.generate(beardBankConfig);
      const evaluation = this.bonusWaysEvaluator.evaluate(bonusGrid.matrix, beardBankConfig, wagerUnits);
      await this.cabinet.spinTo(bonusGrid.matrix);
      if (evaluation.wayWins.length > 0) await this.cabinet.presentWins(evaluation.wayWins);
      const symbols = bonusGrid.matrix.flat();
      const multipliedAward = evaluation.awardUnits * multiplier;
      this.cabinet.setWin(`$${formatCreditUnits(multipliedAward)}`);
      this.cabinet.setStatus(evaluation.awardUnits > 0 ? `FREE SPIN WIN ${multiplier}×` : "FREE SPIN");
      return { awardUnits: multipliedAward, retriggerDoors: symbols.filter((symbol) => symbol === "vault-door").length, vernonCount: symbols.filter((symbol) => symbol === "vernon").length };
    });
  }

  private async handleSpin(fromAuto = false): Promise<boolean> {
    if (this.isSpinning) return false;

    let featureTriggered = false;

    try {
      this.isSpinning = true;
      this.cabinet.setSpinEnabled(false);
      this.cabinet.setWin("$0.00");
      this.cabinet.setStatus("SPINNING");

      const wagerUnits = BET_LEVELS[this.betIndex]!;
      const result = this.coordinator.executeSpin(wagerUnits, this.gameState);
      this.gameState = result.featureResolution.finalGameState;
      const coins = result.grid.matrix.flat().filter((symbol) => symbol === "beard-coin").length;
      const vaultDoors = result.grid.matrix.flat().filter((symbol) => symbol === "vault-door").length;
      const stackedVaultDoors = result.grid.matrix.some((column) => column.every((symbol) => symbol === "vault-door"));
      const previousCharges = this.gameState.livingVaultCharges;
      this.gameState = { ...this.gameState, livingVaultCharges: Math.min(30, previousCharges + coins), lifetimeCoinsCollected: this.gameState.lifetimeCoinsCollected + coins };
      this.cabinet.setVaultCharge(this.gameState.livingVaultCharges);
      this.onProgressChange(this.gameState.livingVaultCharges, this.gameState.lifetimeCoinsCollected);
      this.refreshWalletDisplay();

      await this.cabinet.prepareAnticipation(coins, vaultDoors);
      await this.cabinet.spinTo(result.grid.matrix);
      if (coins > 0) await this.cabinet.collectCoins(coins);

      if (result.totalAwardUnits > 0) {
        this.cabinet.setStatus(`${result.wayWins.length} WIN${result.wayWins.length === 1 ? "" : "S"}`);
        await this.cabinet.presentWins(result.wayWins, (presentedAwardUnits) => {
          this.cabinet.setWin(`$${formatCreditUnits(presentedAwardUnits)}`);
        });
        this.cabinet.setWin(`$${formatCreditUnits(result.totalAwardUnits)}`);
        this.cabinet.setStatus("WINNER");
        await this.cabinet.celebrateWin(result.totalAwardUnits, wagerUnits);
      } else {
        this.cabinet.setStatus("READY");
      }
      const meterFilled = previousCharges < 30 && this.gameState.livingVaultCharges >= 30;
      let featureAward = 0;
      if (coins >= 3) {
        featureTriggered = true;
        this.cabinet.setStatus("BONUS!");
        const bonusAward = await this.cabinet.playVaultHeist(wagerUnits, coins);
        if (bonusAward > 0) this.wallet.award(bonusAward, { reason: "Vault Heist bonus", metadata: { gameId: "beard-bank" } });
        featureAward += bonusAward;
      }
      if (stackedVaultDoors) {
        featureTriggered = true;
        this.cabinet.setStatus("FREE SPINS!");
        const award = await this.runVernonFreeSpins(wagerUnits, vaultDoors);
        if (award > 0) this.wallet.award(award, { reason: "Vernon's Free Spins", metadata: { gameId: "beard-bank" } });
        featureAward += award;
      }
      if (meterFilled) {
        featureTriggered = true;
        this.cabinet.setStatus("LIVING VAULT!");
        const award = await this.cabinet.playLivingVaultRespin(wagerUnits);
        if (award > 0) this.wallet.award(award, { reason: "Living Vault Hold & Respin", metadata: { gameId: "beard-bank" } });
        featureAward += award;
        this.gameState = { ...this.gameState, livingVaultCharges: 0 };
        this.cabinet.setVaultCharge(0);
        this.onProgressChange(0, this.gameState.lifetimeCoinsCollected);
      }
      if (featureAward > 0) {
        this.cabinet.setWin(`$${formatCreditUnits(featureAward)}`);
        this.cabinet.setStatus("FEATURES PAID");
      }
      this.refreshWalletDisplay();
      return featureTriggered;
    } catch (error: unknown) {
      console.error("Spin failed", error);
      this.cabinet.setStatus(error instanceof Error ? error.message.toUpperCase() : "SPIN ERROR");
      if (fromAuto) this.stopAuto("AUTO STOPPED • SPIN ERROR");
      return true;
    } finally {
      this.isSpinning = false;
      this.refreshBetControls();
    }
  }

  private handleAutoSelection(spins: number | "infinite"): void {
    if (this.autoSpinsRemaining !== null) {
      this.autoStopRequested = true;
      this.cabinet.setStatus("AUTO STOPS AFTER THIS SPIN");
      return;
    }
    if (this.isSpinning) return;
    const wager = BET_LEVELS[this.betIndex]!;
    if (!this.wallet.canAfford(wager)) {
      this.cabinet.setStatus("INSUFFICIENT CREDIT");
      return;
    }
    this.autoSpinsRemaining = spins;
    this.autoStopRequested = false;
    this.cabinet.setAutoState(true, spins === "infinite" ? undefined : spins);
    void this.runAutoSpins();
  }

  private async runAutoSpins(): Promise<void> {
    while (this.autoSpinsRemaining !== null && !this.autoStopRequested) {
      const wager = BET_LEVELS[this.betIndex]!;
      if (!this.wallet.canAfford(wager)) {
        this.stopAuto("AUTO COMPLETE • LOW CREDIT");
        return;
      }
      const featureTriggered = await this.handleSpin(true);
      if (this.autoSpinsRemaining === null) return;
      if (this.autoSpinsRemaining !== "infinite") {
        this.autoSpinsRemaining -= 1;
        if (this.autoSpinsRemaining <= 0) {
          this.stopAuto("AUTO SPINS COMPLETE");
          return;
        }
      }
      if (featureTriggered) {
        this.stopAuto("AUTO STOPPED • FEATURE WON");
        return;
      }
      this.cabinet.setAutoState(true, this.autoSpinsRemaining === "infinite" ? undefined : this.autoSpinsRemaining);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 450));
    }
    if (this.autoStopRequested) this.stopAuto("AUTO SPIN STOPPED");
  }

  private stopAuto(status?: string): void {
    this.autoSpinsRemaining = null;
    this.autoStopRequested = false;
    this.cabinet.setAutoState(false);
    if (status) this.cabinet.setStatus(status);
    this.refreshBetControls();
  }

  private refreshWalletDisplay(): void {
    const snapshot = this.wallet.getSnapshot();
    this.cabinet.setCredit(`$${formatCreditUnits(snapshot.casinoWalletUnits)}`);
    this.onBalanceChange(snapshot.casinoWalletUnits);
    this.refreshBetControls();
  }

  private changeBet(direction: -1 | 1): void {
    if (this.isSpinning || this.autoSpinsRemaining !== null) return;
    this.betIndex = Math.max(0, Math.min(BET_LEVELS.length - 1, this.betIndex + direction));
    this.refreshBetControls();
  }

  private refreshBetControls(): void {
    const wager = BET_LEVELS[this.betIndex]!;
    this.cabinet.setBet(`$${formatCreditUnits(wager)}`);
    const controlsReady = !this.isSpinning && this.autoSpinsRemaining === null;
    this.cabinet.setBetEnabled(controlsReady && this.betIndex > 0, controlsReady && this.betIndex < BET_LEVELS.length - 1);
    this.cabinet.setSpinEnabled(controlsReady && this.wallet.canAfford(wager));
  }

  private exitToLobby(): void {
    if (this.isSpinning) return;
    this.stopAuto();
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("casino:dev", this.handleDeveloperAction as EventListener);
    this.onBalanceChange(this.wallet.getSnapshot().casinoWalletUnits);
    this.root.destroy({ children: true });
    this.onExit();
  }

  private readonly handleResize = (): void => {
    this.resize(this.app.renderer.width, this.app.renderer.height);
  };

  private resize(width: number, height: number): void {
    const portrait = height > width && width < 820;
    this.cabinet.setPortraitMode(portrait);
    const horizontalPadding = 12;
    const verticalPadding = 12;
    const availableWidth = width - horizontalPadding * 2;
    const availableHeight = height - verticalPadding * 2;
    const scale = Math.min(
      availableWidth / this.cabinet.cabinetWidth,
      availableHeight / this.cabinet.cabinetHeight,
      1,
    );

    this.cabinet.scale.set(scale);
    this.cabinet.position.set(
      (width - this.cabinet.cabinetWidth * scale) / 2,
      portrait ? verticalPadding : (height - this.cabinet.cabinetHeight * scale) / 2,
    );
  }
}
