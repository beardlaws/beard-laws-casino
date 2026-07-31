import { Container, Graphics, Rectangle, Text } from "pixi.js";
import type { WayWin } from "../engine/WaysEvaluator";
import { ReelSet } from "./ReelSet";
import { LivingVault } from "./LivingVault";

export interface CabinetReelBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const CABINET_WIDTH = 1100;
const CABINET_HEIGHT = 720;

const COLORS = {
  deepBlack: 0x07040d,
  backgroundPurple: 0x130720,
  cabinetPurple: 0x241039,
  panelPurple: 0x351653,
  brightPurple: 0x7d35b5,
  darkGold: 0x815713,
  gold: 0xe5b93f,
  brightGold: 0xffe58a,
  cream: 0xffefbd,
  red: 0xb72e3d,
  blue: 0x2582ce,
  green: 0x23a568,
  pink: 0xc63ca6,
} as const;

export class Cabinet extends Container {
  private reelSet!: ReelSet;
  private spinButton!: Container;
  private creditValue!: Text;
  private winValue!: Text;
  private statusValue!: Text;

  private readonly reelBounds: CabinetReelBounds = {
    x: 95,
    y: 276,
    width: 910,
    height: 310,
  };

  public constructor() {
    super();
    this.build();
  }

  public get cabinetWidth(): number {
    return CABINET_WIDTH;
  }

  public get cabinetHeight(): number {
    return CABINET_HEIGHT;
  }

  public getReelBounds(): CabinetReelBounds {
    return this.reelBounds;
  }

  public onSpin(handler: () => void): void {
    this.spinButton.eventMode = "static";
    this.spinButton.cursor = "pointer";
    this.spinButton.removeAllListeners();
    this.spinButton.on("pointerdown", () => this.spinButton.scale.set(0.97));
    this.spinButton.on("pointerup", () => this.spinButton.scale.set(1));
    this.spinButton.on("pointerupoutside", () => this.spinButton.scale.set(1));
    this.spinButton.on("pointertap", handler);
  }

  public setSpinEnabled(enabled: boolean): void {
    this.spinButton.eventMode = enabled ? "static" : "none";
    this.spinButton.alpha = enabled ? 1 : 0.55;
  }

  public setCredit(value: string): void {
    this.creditValue.text = value;
  }

  public setWin(value: string): void {
    this.winValue.text = value;
  }

  public setStatus(value: string): void {
    this.statusValue.text = value;
  }

  public spinTo(matrix: readonly (readonly string[])[]): Promise<void> {
    this.reelSet.resetWinPresentation();
    return this.reelSet.spinTo(matrix);
  }

  public presentWins(
    wayWins: readonly WayWin[],
    onAwardPresented?: (presentedAwardUnits: number) => void,
  ): Promise<void> {
    return this.reelSet.presentWins(wayWins, onAwardPresented);
  }

  private build(): void {
    this.buildAmbientGlow();
    this.buildOuterCabinet();
    this.buildJackpotTopper();
    this.buildMarquee();
    this.buildReelWindow();
    this.buildControlDeck();
  }

  private buildAmbientGlow(): void {
    const glowLarge = new Graphics()
      .ellipse(550, 360, 560, 330)
      .fill({
        color: COLORS.brightPurple,
        alpha: 0.16,
      });

    const glowGold = new Graphics()
      .ellipse(550, 320, 470, 250)
      .fill({
        color: COLORS.gold,
        alpha: 0.07,
      });

    this.addChild(glowLarge, glowGold);
  }

  private buildOuterCabinet(): void {
    const shadow = new Graphics()
      .roundRect(28, 32, 1044, 670, 44)
      .fill({
        color: 0x000000,
        alpha: 0.65,
      });

    const outerFrame = new Graphics()
      .roundRect(20, 20, 1060, 670, 44)
      .fill(COLORS.cabinetPurple)
      .stroke({
        color: COLORS.gold,
        width: 8,
      });

    const outerHighlight = new Graphics()
      .roundRect(32, 32, 1036, 646, 35)
      .stroke({
        color: COLORS.brightGold,
        width: 2,
        alpha: 0.75,
      });

    const innerShell = new Graphics()
      .roundRect(48, 48, 1004, 610, 28)
      .fill(COLORS.backgroundPurple)
      .stroke({
        color: COLORS.darkGold,
        width: 3,
      });

    this.addChild(
      shadow,
      outerFrame,
      outerHighlight,
      innerShell,
    );
  }

  private buildJackpotTopper(): void {
    const grandPanel = this.createJackpotPanel({
      x: 70,
      y: 65,
      width: 450,
      height: 82,
      label: "GRAND",
      amount: "$10,000.00",
      color: COLORS.red,
      amountSize: 38,
    });

    const majorPanel = this.createJackpotPanel({
      x: 580,
      y: 65,
      width: 450,
      height: 82,
      label: "MAJOR",
      amount: "$5,000.00",
      color: COLORS.blue,
      amountSize: 38,
    });

    const minorPanel = this.createJackpotPanel({
      x: 70,
      y: 157,
      width: 255,
      height: 68,
      label: "MINOR",
      amount: "$500.00",
      color: COLORS.green,
      amountSize: 27,
    });

    const vaultPanel = this.createVaultPanel();

    const miniPanel = this.createJackpotPanel({
      x: 775,
      y: 157,
      width: 255,
      height: 68,
      label: "MINI",
      amount: "$50.00",
      color: COLORS.pink,
      amountSize: 27,
    });

    this.addChild(
      grandPanel,
      majorPanel,
      minorPanel,
      vaultPanel,
      miniPanel,
    );
  }

  private createJackpotPanel(options: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly label: string;
    readonly amount: string;
    readonly color: number;
    readonly amountSize: number;
  }): Container {
    const panel = new Container();

    const shadow = new Graphics()
      .roundRect(
        options.x + 5,
        options.y + 6,
        options.width,
        options.height,
        14,
      )
      .fill({
        color: 0x000000,
        alpha: 0.7,
      });

    const frame = new Graphics()
      .roundRect(
        options.x,
        options.y,
        options.width,
        options.height,
        14,
      )
      .fill(COLORS.deepBlack)
      .stroke({
        color: COLORS.gold,
        width: 4,
      });

    const innerGlow = new Graphics()
      .roundRect(
        options.x + 6,
        options.y + 6,
        options.width - 12,
        options.height - 12,
        10,
      )
      .stroke({
        color: options.color,
        width: 4,
        alpha: 0.8,
      });

    const label = new Text({
      text: options.label,
      style: {
        fontFamily: "Arial Black, Arial",
        fontSize: 18,
        fontWeight: "bold",
        fill: options.color,
        letterSpacing: 3,
      },
    });

    label.anchor.set(0.5);
    label.position.set(
      options.x + options.width / 2,
      options.y + 20,
    );

    const amount = new Text({
      text: options.amount,
      style: {
        fontFamily: "Arial Black, Arial",
        fontSize: options.amountSize,
        fontWeight: "bold",
        fill: COLORS.brightGold,
      },
    });

    amount.anchor.set(0.5);
    amount.position.set(
      options.x + options.width / 2,
      options.y + options.height - 28,
    );

    panel.addChild(
      shadow,
      frame,
      innerGlow,
      label,
      amount,
    );

    return panel;
  }

  private createVaultPanel(): Container {
    const vault = new LivingVault();

    vault.position.set(345, 155);

    return vault;
  }

  private buildMarquee(): void {
    const marquee = new Graphics()
      .roundRect(95, 240, 910, 48, 13)
      .fill(COLORS.panelPurple)
      .stroke({
        color: COLORS.darkGold,
        width: 3,
      });

    const title = new Text({
      text: "BEARD BANK",
      style: {
        fontFamily: "Arial Black, Arial",
        fontSize: 25,
        fontWeight: "bold",
        fill: COLORS.brightGold,
        letterSpacing: 8,
      },
    });

    title.anchor.set(0.5);
    title.position.set(550, 263);

    this.addChild(marquee, title);
  }

  private buildReelWindow(): void {
    const reelShadow = new Graphics()
      .roundRect(
        this.reelBounds.x + 7,
        this.reelBounds.y + 9,
        this.reelBounds.width,
        this.reelBounds.height,
        24,
      )
      .fill({
        color: 0x000000,
        alpha: 0.8,
      });

    const reelFrame = new Graphics()
      .roundRect(
        this.reelBounds.x,
        this.reelBounds.y,
        this.reelBounds.width,
        this.reelBounds.height,
        24,
      )
      .fill(COLORS.deepBlack)
      .stroke({
        color: COLORS.gold,
        width: 6,
      });

    const innerFrame = new Graphics()
      .roundRect(
        this.reelBounds.x + 10,
        this.reelBounds.y + 10,
        this.reelBounds.width - 20,
        this.reelBounds.height - 20,
        18,
      )
      .stroke({
        color: COLORS.brightGold,
        width: 2,
        alpha: 0.65,
      });

    this.addChild(
      reelShadow,
      reelFrame,
      innerFrame,
    );

    const reelPadding = 18;

    this.reelSet = new ReelSet(
      this.reelBounds.width - reelPadding * 2,
      this.reelBounds.height - reelPadding * 2,
    );

    this.reelSet.position.set(
      this.reelBounds.x + reelPadding,
      this.reelBounds.y + reelPadding,
    );

    this.addChild(this.reelSet);

    this.buildGlassReflection();
  }

  private buildGlassReflection(): void {
    const reflection = new Graphics()
      .roundRect(
        this.reelBounds.x + 15,
        this.reelBounds.y + 14,
        this.reelBounds.width - 30,
        54,
        12,
      )
      .fill({
        color: 0xffffff,
        alpha: 0.035,
      });

    this.addChild(reflection);
  }

  private buildControlDeck(): void {
    const deck = new Graphics()
      .roundRect(70, 610, 960, 58, 18)
      .fill(COLORS.deepBlack)
      .stroke({ color: COLORS.darkGold, width: 3 });

    this.addChild(deck);

    const creditReadout = this.createReadout("CREDIT", "$100.00", 88, 620, 210);
    const betReadout = this.createReadout("BET", "$1.00", 310, 620, 170);
    const winReadout = this.createReadout("WIN", "$0.00", 492, 620, 190);
    this.creditValue = creditReadout.valueText;
    this.winValue = winReadout.valueText;
    this.addChild(creditReadout.container, betReadout.container, winReadout.container);

    const statusPanel = new Graphics()
      .roundRect(695, 620, 115, 38, 12)
      .fill(COLORS.panelPurple)
      .stroke({ color: COLORS.brightPurple, width: 2 });

    this.statusValue = new Text({
      text: "READY",
      style: {
        fontFamily: "Arial Black, Arial",
        fontSize: 13,
        fontWeight: "bold",
        fill: COLORS.cream,
        letterSpacing: 0.5,
      },
    });
    this.statusValue.anchor.set(0.5);
    this.statusValue.position.set(752.5, 639);

    const spinGlow = new Graphics()
      .roundRect(823, 615, 186, 48, 16)
      .fill({ color: COLORS.gold, alpha: 0.18 });

    this.spinButton = new Container();
    this.spinButton.position.set(830, 620);
    this.spinButton.hitArea = new Rectangle(0, 0, 172, 38);

    const spinFace = new Graphics()
      .roundRect(0, 0, 172, 38, 13)
      .fill(COLORS.gold)
      .stroke({ color: COLORS.brightGold, width: 3 });

    const spinText = new Text({
      text: "SPIN",
      style: {
        fontFamily: "Arial Black, Arial",
        fontSize: 19,
        fontWeight: "bold",
        fill: COLORS.backgroundPurple,
        letterSpacing: 2,
      },
    });
    spinText.anchor.set(0.5);
    spinText.position.set(86, 19);
    spinText.eventMode = "none";
    spinFace.eventMode = "none";
    this.spinButton.addChild(spinFace, spinText);

    this.addChild(statusPanel, this.statusValue, spinGlow, this.spinButton);
  }

  private createReadout(
    label: string,
    value: string,
    x: number,
    y: number,
    width: number,
  ): { readonly container: Container; readonly valueText: Text } {
    const container = new Container();

    const box = new Graphics()
      .roundRect(x, y, width, 38, 11)
      .fill(0x100718)
      .stroke({
        color: 0x5e3b76,
        width: 2,
      });

    const labelText = new Text({
      text: label,
      style: {
        fontFamily: "Arial",
        fontSize: 12,
        fontWeight: "bold",
        fill: COLORS.gold,
      },
    });

    labelText.position.set(
      x + 14,
      y + 5,
    );

    const valueText = new Text({
      text: value,
      style: {
        fontFamily: "Arial Black, Arial",
        fontSize: 17,
        fontWeight: "bold",
        fill: COLORS.cream,
      },
    });

    valueText.position.set(
      x + 14,
      y + 17,
    );

    container.addChild(
      box,
      labelText,
      valueText,
    );

    return { container, valueText };
  }
}