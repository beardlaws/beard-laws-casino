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

const WAGER_UNITS = 100;

export class GameScene {
  private readonly root = new Container();
  private readonly cabinet = new Cabinet();
  private readonly wallet = new WalletManager(
    { bankUnits: 0, casinoWalletUnits: 10_000 },
    {
      createTransactionId: () => crypto.randomUUID(),
      now: () => new Date(),
    },
  );
  private readonly coordinator = new SpinCoordinator<BeardBankGameState, BeardBankSpinMetadata>(
    this.wallet,
    new ReelGenerator(new CryptoRandomSource()),
    new WaysEvaluator(),
    new FeaturePipeline([]),
    beardBankSpinMetadataFactory,
    beardBankConfig,
    { createSpinId: () => crypto.randomUUID() },
  );

  private gameState = initialBeardBankGameState;
  private isSpinning = false;

  public constructor(private readonly app: PixiApplication) {}

  public initialize(): void {
    this.root.addChild(this.cabinet);
    this.app.stage.addChild(this.root);
    this.cabinet.onSpin(() => { void this.handleSpin(); });
    this.refreshWalletDisplay();
    this.resize(this.app.renderer.width, this.app.renderer.height);
    window.addEventListener("resize", this.handleResize);
  }

  private async handleSpin(): Promise<void> {
    if (this.isSpinning) return;

    try {
      this.isSpinning = true;
      this.cabinet.setSpinEnabled(false);
      this.cabinet.setWin("$0.00");
      this.cabinet.setStatus("SPINNING");

      const result = this.coordinator.executeSpin(WAGER_UNITS, this.gameState);
      this.gameState = result.featureResolution.finalGameState;
      this.refreshWalletDisplay();

      await this.cabinet.spinTo(result.grid.matrix);

      this.cabinet.setWin(`$${formatCreditUnits(result.totalAwardUnits)}`);
      this.cabinet.setStatus(result.totalAwardUnits > 0 ? "WINNER" : "READY");
      this.refreshWalletDisplay();
    } catch (error: unknown) {
      console.error("Spin failed", error);
      this.cabinet.setStatus(error instanceof Error ? error.message.toUpperCase() : "SPIN ERROR");
    } finally {
      this.isSpinning = false;
      this.cabinet.setSpinEnabled(this.wallet.canAfford(WAGER_UNITS));
    }
  }

  private refreshWalletDisplay(): void {
    const snapshot = this.wallet.getSnapshot();
    this.cabinet.setCredit(`$${formatCreditUnits(snapshot.casinoWalletUnits)}`);
  }

  private readonly handleResize = (): void => {
    this.resize(this.app.renderer.width, this.app.renderer.height);
  };

  private resize(width: number, height: number): void {
    const horizontalPadding = 40;
    const verticalPadding = 40;
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
      (height - this.cabinet.cabinetHeight * scale) / 2,
    );
  }
}
