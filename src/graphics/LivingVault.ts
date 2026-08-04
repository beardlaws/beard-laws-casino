import { Container, Graphics, Text, Ticker } from "pixi.js";

const WIDTH = 410;
const HEIGHT = 78;

const COLORS = {
  black: 0x07040d,
  darkPurple: 0x1a0928,
  brightPurple: 0x9a4de0,
  gold: 0xe5b93f,
  brightGold: 0xffe58a,
  cream: 0xffefbd,
} as const;

export class LivingVault extends Container {
  private readonly glow = new Graphics();
  private readonly vaultDoor = new Container();
  private readonly coreGlow = new Graphics();
  private elapsedSeconds = 0;

  public constructor() {
    super();
    this.build();
    Ticker.shared.add(this.update);
  }

  public override destroy(options?: Parameters<Container["destroy"]>[0]): void {
    Ticker.shared.remove(this.update);
    super.destroy(options);
  }

  private build(): void {
    const shadow = new Graphics()
      .roundRect(5, 6, WIDTH, HEIGHT, 16)
      .fill({ color: 0x000000, alpha: 0.7 });

    const frame = new Graphics()
      .roundRect(0, 0, WIDTH, HEIGHT, 16)
      .fill(COLORS.darkPurple)
      .stroke({ color: COLORS.brightGold, width: 5 });

    const innerFrame = new Graphics()
      .roundRect(8, 8, WIDTH - 16, HEIGHT - 16, 11)
      .stroke({ color: COLORS.brightPurple, width: 3, alpha: 0.8 });

    this.glow
      .roundRect(3, 3, WIDTH - 6, HEIGHT - 6, 14)
      .stroke({ color: COLORS.gold, width: 7, alpha: 0.18 });

    this.buildVaultDoor();

    const title = new Text({
      text: "THE LIVING VAULT",
      style: {
        fontFamily: "Arial Black, Arial",
        fontSize: 22,
        fontWeight: "bold",
        fill: COLORS.brightGold,
        letterSpacing: 1.7,
      },
    });
    title.anchor.set(0.5);
    title.position.set(247, 25);

    const subtitle = new Text({
      text: "COLLECT COINS • AWAKEN WHAT'S INSIDE",
      style: {
        fontFamily: "Arial",
        fontSize: 10,
        fontWeight: "bold",
        fill: COLORS.cream,
        letterSpacing: 0.55,
      },
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(247, 49);

    this.addChild(shadow, frame, this.glow, innerFrame, this.vaultDoor, title, subtitle);
  }

  private buildVaultDoor(): void {
    const cx = 50;
    const cy = 39;
    const doorShadow = new Graphics().circle(cx + 4, cy + 4, 31).fill({ color: 0x000000, alpha: 0.65 });
    const outerRing = new Graphics().circle(cx, cy, 31).fill(0x150a20).stroke({ color: COLORS.gold, width: 4 });
    const innerRing = new Graphics().circle(cx, cy, 22).fill(COLORS.black).stroke({ color: COLORS.brightPurple, width: 3 });
    this.coreGlow.circle(cx, cy, 17).fill({ color: COLORS.gold, alpha: 0.14 });
    const horizontalBar = new Graphics().roundRect(cx - 20, cy - 3, 40, 6, 3).fill(COLORS.gold);
    const verticalBar = new Graphics().roundRect(cx - 3, cy - 20, 6, 40, 3).fill(COLORS.gold);
    const lockCore = new Graphics().circle(cx, cy, 7).fill(COLORS.gold).stroke({ color: COLORS.brightGold, width: 2 });

    this.vaultDoor.addChild(doorShadow, outerRing, innerRing, this.coreGlow, horizontalBar, verticalBar, lockCore);
  }

  private readonly update = (ticker: Ticker): void => {
    this.elapsedSeconds += ticker.deltaMS / 1000;
    const breathing = 1 + Math.sin(this.elapsedSeconds * 2.1) * 0.02;
    this.vaultDoor.scale.set(breathing);
    this.vaultDoor.position.set(50 - 50 * breathing, 39 - 39 * breathing);

    const glowPulse = 0.12 + (Math.sin(this.elapsedSeconds * 3.2) + 1) * 0.08;
    this.glow.alpha = glowPulse;
    this.coreGlow.alpha = glowPulse * 1.8;

    const twitchCycle = this.elapsedSeconds % 6;
    this.vaultDoor.rotation = twitchCycle > 5.72 && twitchCycle < 5.78
      ? -0.02
      : twitchCycle >= 5.78 && twitchCycle < 5.84
        ? 0.02
        : 0;
  };
}
