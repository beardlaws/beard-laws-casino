import { Container, Graphics, Sprite, Text, Ticker } from "pixi.js";
import type { WayWin } from "../engine/WaysEvaluator";
import { ReelSet } from "./ReelSet";

export interface CabinetReelBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface VernonFreeSpinResult {
  readonly awardUnits: number;
  readonly retriggerDoors: number;
  readonly vernonCount: number;
}

const CABINET_WIDTH = 1672;
const CABINET_HEIGHT = 941;
const GOLD = 0xffd86b;
const PURPLE = 0xa943ff;

export class Cabinet extends Container {
  private readonly backgroundLayer = new Container();
  private readonly reelLayer = new Container();
  private readonly energyLayer = new Container();
  private readonly controlLayer = new Container();
  private readonly headerLayer = new Container();
  private readonly portraitShell = new Container();
  private portraitMode = false;
  private reelSet!: ReelSet;
  private spinButton!: Graphics;
  private spinText!: Text;
  private autoButton!: Graphics;
  private autoText!: Text;
  private autoMenu: Container | undefined;
  private autoActive = false;
  private creditValue!: Text;
  private winValue!: Text;
  private statusValue!: Text;
  private homeButton!: Graphics;
  private homeLabel!: Text;
  private infoButton!: Graphics;
  private infoLabel!: Text;
  private buildBadge!: Text;
  private betMinusButton!: Graphics;
  private betPlusButton!: Graphics;
  private betValue!: Text;
  private creditContainer!: Container;
  private betContainer!: Container;
  private winContainer!: Container;
  private statusBox!: Graphics;
  private betMinusText!: Text;
  private betPlusText!: Text;
  private vaultMeterFill!: Graphics;
  private vaultMeterText!: Text;
  private chaseHeist!: Text;
  private chaseSpins!: Text;
  private rulesOverlay: Container | undefined;
  private readonly energy = new Graphics();
  private elapsed = 0;

  private reelBounds: CabinetReelBounds = {
    x: 132,
    y: 430,
    width: 1408,
    height: 426,
  };

  public constructor() {
    super();
    this.build();
    Ticker.shared.add(this.animate);
  }

  public override destroy(options?: Parameters<Container["destroy"]>[0]): void {
    Ticker.shared.remove(this.animate);
    super.destroy(options);
  }

  public get cabinetWidth(): number { return this.portraitMode ? 720 : CABINET_WIDTH; }
  public get cabinetHeight(): number { return this.portraitMode ? 1500 : CABINET_HEIGHT; }
  public getReelBounds(): CabinetReelBounds { return this.reelBounds; }

  public setPortraitMode(enabled: boolean): void {
    if (enabled === this.portraitMode) return;
    this.portraitMode = enabled;
    if (enabled) {
      this.backgroundLayer.visible = false;
      this.portraitShell.visible = true;
      this.reelBounds = { x: 58, y: 650, width: 604, height: 558 };
      this.rebuildReels();
      this.layoutPortrait();
    } else {
      this.backgroundLayer.visible = true;
      this.portraitShell.visible = false;
      this.reelBounds = { x: 132, y: 430, width: 1408, height: 426 };
      this.rebuildReels();
      this.layoutLandscape();
    }
  }

  public onSpin(handler: () => void): void {
    this.spinButton.eventMode = "static";
    this.spinButton.cursor = "pointer";
    this.spinButton.removeAllListeners("pointertap");
    this.spinButton.on("pointertap", handler);
  }

  public onAutoSelect(handler: (spins: number | "infinite") => void): void {
    this.autoButton.eventMode = "static";
    this.autoButton.cursor = "pointer";
    this.autoButton.removeAllListeners("pointertap");
    this.autoButton.on("pointertap", () => {
      if (this.autoActive) handler("infinite");
      else this.toggleAutoMenu(handler);
    });
  }

  public setAutoState(active: boolean, remaining?: number): void {
    this.autoActive = active;
    this.autoText.text = active
      ? `STOP AUTO${remaining === undefined ? " ∞" : ` ${remaining}`}`
      : "AUTO SPIN";
    this.autoText.scale.set(1);
    if (this.autoText.width > 102) this.autoText.scale.set(102 / this.autoText.width);
    this.autoButton.tint = active ? 0xff755c : 0xffffff;
  }

  public onHome(handler: () => void): void {
    this.homeButton.eventMode = "static";
    this.homeButton.cursor = "pointer";
    this.homeButton.removeAllListeners("pointertap");
    this.homeButton.on("pointertap", handler);
  }

  public onInfo(handler: () => void): void {
    this.infoButton.eventMode = "static";
    this.infoButton.cursor = "pointer";
    this.infoButton.removeAllListeners("pointertap");
    this.infoButton.on("pointertap", handler);
  }

  public onBetMinus(handler: () => void): void {
    this.betMinusButton.eventMode = "static";
    this.betMinusButton.cursor = "pointer";
    this.betMinusButton.removeAllListeners("pointertap");
    this.betMinusButton.on("pointertap", handler);
  }

  public onBetPlus(handler: () => void): void {
    this.betPlusButton.eventMode = "static";
    this.betPlusButton.cursor = "pointer";
    this.betPlusButton.removeAllListeners("pointertap");
    this.betPlusButton.on("pointertap", handler);
  }

  public toggleRules(): void {
    if (this.rulesOverlay) {
      this.rulesOverlay.destroy({ children: true });
      this.rulesOverlay = undefined;
      return;
    }

    const overlay = new Container();
    const shade = new Graphics().rect(0, 0, CABINET_WIDTH, CABINET_HEIGHT)
      .fill({ color: 0x020104, alpha: 0.92 });
    const panel = new Graphics().roundRect(205, 72, 1262, 785, 30)
      .fill({ color: 0x13051f, alpha: 0.99 })
      .stroke({ color: GOLD, width: 7 });
    const title = new Text({ text: "BEARD BANK • PAYTABLE & FEATURES", style: { fontFamily: "Arial Black, Arial", fontSize: 47, fontWeight: "bold", fill: GOLD, letterSpacing: 2 } });
    title.anchor.set(0.5); title.position.set(836, 126);
    const intro = new Text({ text: "5 REELS • 3 ROWS • 243 WAYS • ADJUSTABLE BET", style: { fontFamily: "Arial", fontSize: 23, fontWeight: "bold", fill: 0xe8c9f7, letterSpacing: 2 } });
    intro.anchor.set(0.5); intro.position.set(836, 178);

    const rules = new Text({
      text: [
        "SYMBOL                         3 REELS       4 REELS       5 REELS",
        "LUXURY KIT                     0.55×          4.76×         21.42×",
        "VAULT CREST                    0.40×          3.332×        13.09×",
        "CROWN                          0.30×          2.38×          8.925×",
        "OIL / BALM / RAZOR / COMB      —              0.595×+         1.785×+",
        "",
        "GOLD CREST • WILD: substitutes for all ordinary paying symbols.",
        "PREMIUMS PAY ON 3+ REELS • LOW SYMBOLS PAY ON 4+ REELS.",
        "COINS, VERNON, DOORS & KEYS DO NOT CREATE ORDINARY WAYS WINS.",
        "Multiple matching positions create multiple ways; awards are added together.",
      ].join("\n"),
      style: { fontFamily: "Courier New, monospace", fontSize: 23, fontWeight: "bold", fill: 0xffeabd, lineHeight: 39 },
    });
    rules.position.set(285, 222);

    const bonusBox = new Graphics().roundRect(276, 633, 1120, 137, 18)
      .fill({ color: 0x321345, alpha: 1 }).stroke({ color: 0xd26aff, width: 4 });
    const bonus = new Text({
      text: "THREE WAYS INTO THE VAULT\n3+ BEARD COINS: Vault Heist  •  STACKED VAULT DOORS: Vernon's Free Spins\nBEARD COINS awaken the hidden Living Vault • MINI 10× • MINOR 25× • MAJOR 100× • GRAND 500×.",
      style: { fontFamily: "Arial Black, Arial", fontSize: 23, fontWeight: "bold", fill: 0xffe694, align: "center", lineHeight: 34 },
    });
    bonus.anchor.set(0.5); bonus.position.set(836, 701);
    const close = new Graphics().roundRect(678, 790, 316, 48, 12)
      .fill({ color: 0xefbd4d, alpha: 1 }).stroke({ color: 0xfff0a0, width: 3 });
    close.eventMode = "static"; close.cursor = "pointer";
    const closeText = new Text({ text: "RETURN TO GAME", style: { fontFamily: "Arial Black, Arial", fontSize: 20, fontWeight: "bold", fill: 0x241000 } });
    closeText.anchor.set(0.5); closeText.position.set(836, 814);
    close.on("pointertap", () => this.toggleRules());
    shade.eventMode = "static";
    overlay.addChild(shade, panel, title, intro, rules, bonusBox, bonus, close, closeText);
    this.rulesOverlay = overlay;
    this.fitOverlayForCurrentLayout(overlay);
    this.addChild(overlay);
  }

  public setSpinEnabled(enabled: boolean): void {
    this.spinButton.eventMode = enabled ? "static" : "none";
    this.spinButton.alpha = enabled ? 1 : 0.45;
  }

  private toggleAutoMenu(handler: (spins: number | "infinite") => void): void {
    if (this.autoMenu) {
      this.autoMenu.destroy({ children: true });
      this.autoMenu = undefined;
      return;
    }

    const menu = new Container();
    const panel = new Graphics().roundRect(1060, 730, 468, 126, 17)
      .fill({ color: 0x100619, alpha: 0.98 }).stroke({ color: GOLD, width: 4 });
    const title = new Text({ text: "CHOOSE AUTO SPINS", style: { fontFamily: "Arial Black, Arial", fontSize: 18, fontWeight: "bold", fill: GOLD } });
    title.anchor.set(0.5); title.position.set(1294, 757);
    menu.addChild(panel, title);
    const choices: readonly (number | "infinite")[] = [5, 10, 25, 50, "infinite"];
    choices.forEach((choice, index) => {
      const x = 1080 + index * 86;
      const button = new Graphics().roundRect(x, 778, 70, 52, 10)
        .fill({ color: choice === "infinite" ? 0x6d2c91 : 0x301041, alpha: 1 })
        .stroke({ color: 0xe2adff, width: 2 });
      button.eventMode = "static"; button.cursor = "pointer";
      const label = new Text({ text: choice === "infinite" ? "∞" : String(choice), style: { fontFamily: "Arial Black, Arial", fontSize: 22, fontWeight: "bold", fill: 0xffe7a0 } });
      label.anchor.set(0.5); label.position.set(x + 35, 804);
      button.on("pointertap", () => {
        menu.destroy({ children: true });
        this.autoMenu = undefined;
        handler(choice);
      });
      menu.addChild(button, label);
    });
    if (this.portraitMode) {
      menu.scale.set(0.56);
      menu.position.set(-560, 965);
    }
    this.autoMenu = menu;
    this.addChild(menu);
  }

  public setBetEnabled(minusEnabled: boolean, plusEnabled: boolean): void {
    this.betMinusButton.eventMode = minusEnabled ? "static" : "none";
    this.betMinusButton.alpha = minusEnabled ? 1 : 0.38;
    this.betPlusButton.eventMode = plusEnabled ? "static" : "none";
    this.betPlusButton.alpha = plusEnabled ? 1 : 0.38;
  }

  public setCredit(value: string): void { this.creditValue.text = value; }
  public setWin(value: string): void { this.winValue.text = value; }
  public setStatus(value: string): void {
    this.statusValue.text = value;
    this.statusValue.scale.set(1);
    const maxWidth = this.portraitMode ? 590 : 194;
    if (this.statusValue.width > maxWidth) this.statusValue.scale.set(maxWidth / this.statusValue.width);
  }
  public setBet(value: string): void { this.betValue.text = value; }
  public setVaultCharge(value: number): void {
    const charge = Math.max(0, Math.min(30, value));
    this.energy.alpha = 0.22 + (charge / 30) * 0.22;
    const meterY = this.portraitMode ? 642 : 304;
    const meterHeight = this.portraitMode ? 12 : 18;
    this.vaultMeterFill?.clear().roundRect(38, meterY, 644 * (charge / 30), meterHeight, meterHeight / 2)
      .fill({ color: charge >= 20 ? 0xffd86b : 0xa943ff });
    if (this.vaultMeterText) this.vaultMeterText.text = `LIVING VAULT  ${charge} / 30 CHARGES`;
  }

  public async prepareAnticipation(coins: number, doors: number): Promise<void> {
    const target = coins === 2 ? this.chaseHeist : doors >= 2 ? this.chaseSpins : undefined;
    if (!target || !this.portraitMode) return;
    const original = target.style.fill;
    for (let pulse = 0; pulse < 5; pulse += 1) {
      target.style.fill = pulse % 2 ? 0xffffff : 0xffd86b;
      target.scale.set(pulse % 2 ? 1.04 : 1);
      await this.delay(105);
    }
    target.style.fill = original;
    target.scale.set(1);
  }

  public async collectCoins(count: number): Promise<void> {
    if (count <= 0) return;
    const particles = new Container();
    this.addChild(particles);
    const flights = Array.from({ length: Math.min(count, 5) }, (_, index) => new Promise<void>((resolve) => {
      const coin = new Graphics().circle(0, 0, 18).fill({ color: GOLD }).stroke({ color: 0xfff3ad, width: 4 });
      coin.position.set(370 + index * 220, 648);
      particles.addChild(coin);
      const startX = coin.x; const startY = coin.y; const started = performance.now() + index * 90;
      const fly = (): void => {
        const t = Math.max(0, Math.min(1, (performance.now() - started) / 620));
        const eased = 1 - Math.pow(1 - t, 3);
        coin.position.set(startX + (836 - startX) * eased, startY + (235 - startY) * eased - Math.sin(t * Math.PI) * 100);
        coin.scale.set(1 - eased * 0.55); coin.alpha = 1 - Math.max(0, (t - 0.76) / 0.24);
        if (t < 1) requestAnimationFrame(fly); else resolve();
      };
      requestAnimationFrame(fly);
    }));
    await Promise.all(flights);
    particles.destroy({ children: true });
  }

  public async celebrateWin(awardUnits: number, wagerUnits: number): Promise<void> {
    const multiple = awardUnits / Math.max(1, wagerUnits);
    if (multiple < 5) return;
    const label = multiple >= 100 ? "MEGA WIN" : multiple >= 25 ? "BIG WIN" : "NICE WIN";
    const overlay = new Container();
    const glow = new Graphics().circle(836, 480, 260).fill({ color: multiple >= 25 ? 0x8b28ce : 0x4c176d, alpha: 0.7 });
    const title = new Text({ text: label, style: { fontFamily: "Arial Black, Arial", fontSize: multiple >= 25 ? 92 : 68, fontWeight: "bold", fill: GOLD, stroke: { color: 0x35104d, width: 12 }, letterSpacing: 5 } });
    title.anchor.set(0.5); title.position.set(836, 450);
    const amount = new Text({ text: `$${(awardUnits / 100).toFixed(2)}`, style: { fontFamily: "Arial Black, Arial", fontSize: 54, fontWeight: "bold", fill: 0xffffff } });
    amount.anchor.set(0.5); amount.position.set(836, 535);
    overlay.addChild(glow, title, amount); this.addChild(overlay);
    await new Promise<void>((resolve) => window.setTimeout(resolve, multiple >= 25 ? 1600 : 900));
    overlay.destroy({ children: true });
  }

  public async playVaultHeist(wagerUnits: number, triggerCoins: number): Promise<number> {
    const overlay = new Container();
    const shade = new Graphics().rect(0, 0, CABINET_WIDTH, CABINET_HEIGHT)
      .fill({ color: 0x030106, alpha: 0.9 });
    const panel = new Graphics().roundRect(286, 92, 1100, 750, 34)
      .fill({ color: 0x13051f, alpha: 0.99 })
      .stroke({ color: GOLD, width: 8, alpha: 1 });
    const title = new Text({ text: "VAULT HEIST", style: { fontFamily: "Arial Black, Arial", fontSize: 76, fontWeight: "bold", fill: GOLD, stroke: { color: 0x4b126d, width: 10 }, letterSpacing: 5 } });
    title.anchor.set(0.5); title.position.set(836, 174);
    const coinTier = Math.max(3, Math.min(5, triggerCoins));
    const maxPicks = coinTier === 3 ? 4 : coinTier === 4 ? 5 : 6;
    const startingMultiplier = coinTier >= 4 ? 2 : 1;
    const tierName = coinTier === 3 ? "STANDARD HEIST" : coinTier === 4 ? "DOUBLE-VAULT HEIST" : "GOLDEN HEIST";
    const subtitle = new Text({ text: `${tierName} • ${coinTier}${triggerCoins > 5 ? "+" : ""} BEARD COINS\n${maxPicks} PICKS • ${startingMultiplier}× START • FIND THE GOLDEN KEY • DODGE 3 ALARMS`, style: { fontFamily: "Arial", fontSize: 25, fontWeight: "bold", fill: 0xf2d9ff, align: "center", lineHeight: 38, letterSpacing: 1 } });
    subtitle.anchor.set(0.5); subtitle.position.set(836, 260);
    const totalText = new Text({ text: "BONUS WIN  $0.00", style: { fontFamily: "Arial Black, Arial", fontSize: 34, fontWeight: "bold", fill: 0xffe4a0 } });
    totalText.anchor.set(0.5); totalText.position.set(836, 768);
    overlay.addChild(shade, panel, title, subtitle, totalText);
    this.addChild(overlay);

    // Values are assigned before the first choice. We reveal every unopened
    // box at the end so the player's choice is visibly genuine.
    const prizes = [1, 2, 2, 3, 5, 6, 2, 3, 5, -1, -1, -1, 8, 9, 20];
    for (let i = prizes.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [prizes[i], prizes[j]] = [prizes[j]!, prizes[i]!];
    }
    let alarms = 0;
    let total = 0;
    let picks = 0;
    let finished = false;
    const boxes: Graphics[] = [];
    const labels: Text[] = [];

    return await new Promise<number>((resolve) => {
      const revealLabel = (label: Text, prize: number, chosen: boolean): void => {
        label.text = prize === -1 ? "ALARM" : prize === 20 ? "KEY" : `${prize}×`;
        label.style.fill = prize === -1 ? 0xff5f67 : 0x9dffb0;
        if (!chosen) label.alpha = 0.5;
      };

      const finish = (reason: "alarm" | "key" | "picks"): void => {
        if (finished) return;
        finished = true;
        boxes.forEach((box) => { box.eventMode = "none"; });
        prizes.forEach((prize, index) => {
          if (labels[index]!.text.match(/^\d{2}$/)) revealLabel(labels[index]!, prize!, false);
        });
        if (reason === "alarm") subtitle.text = "THE ALARM SOUNDED — YOU KEEP EVERY CREDIT COLLECTED";
        if (reason === "key") { subtitle.text = "GOLDEN KEY! VERNON DOUBLES THE HEIST"; total *= 2; }
        if (reason === "picks") subtitle.text = "HEIST COMPLETE — ALL UNOPENED BOXES REVEALED";
        total *= startingMultiplier;
        totalText.text = `BONUS WIN  $${(total / 100).toFixed(2)}`;
        const collect = new Graphics().roundRect(682, 792, 308, 58, 14)
          .fill({ color: 0xefbd4d, alpha: 1 }).stroke({ color: 0xfff0a0, width: 4 });
        const collectText = new Text({ text: "COLLECT BONUS", style: { fontFamily: "Arial Black, Arial", fontSize: 22, fontWeight: "bold", fill: 0x241000 } });
        collectText.anchor.set(0.5); collectText.position.set(836, 821);
        collect.eventMode = "static"; collect.cursor = "pointer";
        collect.on("pointertap", () => { overlay.destroy({ children: true }); resolve(total); });
        overlay.addChild(collect, collectText);
      };

      prizes.forEach((prize, index) => {
        const col = index % 5; const row = Math.floor(index / 5);
        const x = 382 + col * 184; const y = 336 + row * 130;
        const box = new Graphics().roundRect(x, y, 154, 98, 14)
          .fill({ color: 0x321345, alpha: 1 }).stroke({ color: 0xc88cff, width: 4 });
        box.eventMode = "static"; box.cursor = "pointer";
        const label = new Text({ text: String(index + 1).padStart(2, "0"), style: { fontFamily: "Arial Black, Arial", fontSize: 29, fill: GOLD } });
        label.anchor.set(0.5); label.position.set(x + 77, y + 49);
        box.on("pointertap", () => {
          if (finished || box.eventMode === "none") return;
          box.eventMode = "none";
          picks += 1;
          revealLabel(label, prize, true);
          if (prize === -1) alarms += 1;
          else if (prize !== 20) total += wagerUnits * prize;
          totalText.text = `BONUS WIN  $${((total * startingMultiplier) / 100).toFixed(2)}   •   PICKS ${picks}/${maxPicks}   •   ALARMS ${alarms}/3`;
          if (prize === 20) finish("key");
          else if (alarms >= 3) finish("alarm");
          else if (picks >= maxPicks) finish("picks");
        });
        boxes.push(box); labels.push(label); overlay.addChild(box, label);
      });
    });
  }

  public async playVernonsFreeSpins(
    triggerDoors: number,
    runSpin: (multiplier: number) => Promise<VernonFreeSpinResult>,
  ): Promise<number> {
    const intro = this.featureShell("VERNON'S FREE SPINS", "REAL REELS • REAL 243-WAY WINS • NO WAGER DEDUCTED");
    const initialSpins = 8 + Math.max(0, triggerDoors - 3) * 2;
    intro.addChild(this.centerText(`${initialSpins} FREE SPINS`, 44, 0xbdf7ff, 330));
    intro.addChild(this.centerText("VAULT DOORS CAN RETRIGGER • VERNON SYMBOLS GROW THE MULTIPLIER", 22, GOLD, 405));
    this.addChild(intro);

    await new Promise<void>((resolve) => {
      const start = this.featureButton("START THE REELS", 650);
      intro.addChild(start.button, start.label);
      start.button.on("pointertap", () => { intro.destroy({ children: true }); resolve(); });
    });

    // The HUD leaves the reel window uncovered. The actual cabinet reels remain
    // visible and animate for every awarded free spin.
    const hud = new Container();
    const hudBar = new Graphics().roundRect(294, 360, 1084, 62, 18)
      .fill({ color: 0x09020f, alpha: 0.96 }).stroke({ color: 0xd26aff, width: 4 });
    const spinsText = this.centerText("", 24, 0xbdf7ff, 390); spinsText.position.x = 500;
    const multiplierText = this.centerText("", 25, GOLD, 390);
    const winText = this.centerText("", 24, 0x9dffb0, 390); winText.position.x = 1170;
    hud.addChild(hudBar, spinsText, multiplierText, winText); this.addChild(hud);

    let remaining = initialSpins;
    let played = 0;
    let multiplier = 1;
    let total = 0;
    while (remaining > 0) {
      remaining -= 1;
      played += 1;
      spinsText.text = `SPIN ${played} • ${remaining} LEFT`;
      multiplierText.text = `VERNON ${multiplier}×`;
      const result = await runSpin(multiplier);
      total += result.awardUnits;
      if (result.retriggerDoors >= 3) {
        const added = result.retriggerDoors >= 5 ? 5 : 3;
        remaining += added;
        spinsText.text = `RETRIGGER +${added} • ${remaining} LEFT`;
        await this.delay(900);
      }
      if (result.vernonCount >= 2) multiplier = Math.min(10, multiplier + 1);
      multiplierText.text = `VERNON ${multiplier}×`;
      winText.text = `FEATURE $${(total / 100).toFixed(2)}`;
      await this.delay(350);
    }
    hud.destroy({ children: true });

    const summary = this.featureShell("FREE SPINS COMPLETE", multiplier >= 5 ? "VERNON WENT FULL VAULTMASTER" : "THE VAULTMASTER HAS SPOKEN");
    summary.addChild(this.centerText(`${played} ACTUAL REEL SPINS`, 30, 0xbdf7ff, 330));
    summary.addChild(this.centerText(`FINAL MULTIPLIER  ${multiplier}×`, 30, GOLD, 405));
    summary.addChild(this.centerText(`FEATURE WIN  $${(total / 100).toFixed(2)}`, 48, 0x9dffb0, 520));
    this.addChild(summary);
    return await new Promise<number>((resolve) => {
      const collect = this.featureButton("COLLECT FREE SPINS", 650);
      collect.button.on("pointertap", () => { summary.destroy({ children: true }); resolve(total); });
      summary.addChild(collect.button, collect.label);
    });
  }

  public async playLivingVaultRespin(wagerUnits: number, forced: { jackpot?: "mini"|"minor"|"major"|"grand"; fullGrid?: boolean } = {}): Promise<number> {
    const overlay = this.featureShell("LIVING VAULT", "HOLD & RESPIN • THREE LIVES");
    const livesText = this.centerText("RESPINS  ● ● ●", 30, 0x9dffdb, 268);
    const actionText = this.centerText("PRESS START • NEW COINS RESET THREE RESPINS", 19, 0xbdf7ff, 310);
    const winText = this.centerText("LOCKED VALUE  $0.00", 37, GOLD, 705);
    type VaultPrize = { label: string; multiple: number; color: number; textColor: number; jackpot: boolean };
    const cells: { coin: Graphics; label: Text; locked: boolean; value: number; prize?: VaultPrize }[] = [];
    for (let i = 0; i < 15; i += 1) {
      const x = 456 + (i % 5) * 190; const y = 370 + Math.floor(i / 5) * 112;
      const coin = new Graphics().roundRect(x - 76, y - 45, 152, 90, 18).fill({ color: 0x13091b }).stroke({ color: 0x613777, width: 4 });
      const label = this.centerText("?", 22, 0x6e4a7d, y); label.position.x = x;
      cells.push({ coin, label, locked: false, value: 0 }); overlay.addChild(coin, label);
    }
    overlay.addChild(livesText, actionText, winText); this.addChild(overlay);
    return await new Promise<number>((resolve) => {
      const start = this.featureButton("CRACK THE LIVING VAULT", 770); overlay.addChild(start.button, start.label);
      start.button.on("pointertap", async () => {
        start.button.eventMode = "none"; start.button.alpha = 0; start.label.alpha = 0;
        let lives = 3; let total = 0; let first = true; let respin = 0;
        while (lives > 0 && cells.some((cell) => !cell.locked)) {
          respin += 1;
          actionText.text = `RESPIN ${respin} • CHAMBERS SEARCHING…`;
          const openCells = cells.filter((cell) => !cell.locked);
          for (let pulse = 0; pulse < 6; pulse += 1) {
            for (const cell of openCells) {
              cell.label.text = ["◆", "?", "✦"][this.randomInt(3)]!;
              cell.label.style.fill = pulse % 2 ? 0x9dffdb : 0xd26aff;
              cell.coin.alpha = pulse % 2 ? 0.62 : 1;
            }
            await this.delay(110 + pulse * 18);
          }
          // A restrained hold-and-respin curve: a readable opening drop without
          // the old runaway loop that filled most of the board almost every time.
          const hits = forced.fullGrid ? openCells : openCells.filter(() => this.randomInt(10_000) < (first ? 1_200 : 400));
          for (const cell of openCells) {
            if (hits.includes(cell)) continue;
            cell.label.text = "?"; cell.label.style.fill = 0x6e4a7d; cell.coin.alpha = 1;
          }
          for (const [hitIndex, cell] of hits.entries()) {
            cell.locked = true;
            const roll = this.randomInt(10_000);
            const forcedMultiple = first && hitIndex === 0 && forced.jackpot ? ({ mini: 10, minor: 25, major: 100, grand: 500 } as const)[forced.jackpot] : undefined;
            const forcedLabel = forced.jackpot?.toUpperCase();
            const prize: VaultPrize = forcedMultiple
              ? { label: forcedLabel!, multiple: forcedMultiple, color: forced.jackpot === "grand" ? 0xfff2a0 : forced.jackpot === "major" ? 0xff4f63 : forced.jackpot === "minor" ? 0x38dcff : 0xb56cff, textColor: forced.jackpot === "grand" ? 0x5a1800 : forced.jackpot === "minor" ? 0x031b32 : 0xffffff, jackpot: true }
              : roll < 0
              ? { label: "GRAND", multiple: 500, color: 0xfff2a0, textColor: 0x5a1800, jackpot: true }
              : roll < 1
                ? { label: "MAJOR", multiple: 100, color: 0xff4f63, textColor: 0xffffff, jackpot: true }
                : roll < 11
                  ? { label: "MINOR", multiple: 25, color: 0x38dcff, textColor: 0x031b32, jackpot: true }
                  : roll < 61
                    ? { label: "MINI", multiple: 10, color: 0xb56cff, textColor: 0xffffff, jackpot: true }
                    : roll < 8_061
                      ? { label: "1×", multiple: 1, color: 0xffce52, textColor: 0x241000, jackpot: false }
                      : roll < 9_561
                        ? { label: "2×", multiple: 2, color: 0xffce52, textColor: 0x241000, jackpot: false }
                        : roll < 9_937
                          ? { label: "5×", multiple: 5, color: 0xffce52, textColor: 0x241000, jackpot: false }
                          : { label: "10×", multiple: 10, color: 0xffce52, textColor: 0x241000, jackpot: false };
            cell.prize = prize;
            cell.value = wagerUnits * prize.multiple; total += cell.value; cell.label.text = prize.label; cell.label.style.fill = prize.textColor;
            cell.label.style.fontSize = prize.jackpot ? 15 : 22;
            cell.coin.clear().roundRect(cell.label.x - 76, cell.label.y - 45, 152, 90, 18).fill({ color: prize.color }).stroke({ color: prize.jackpot ? 0xffffff : 0xffffb0, width: prize.jackpot ? 7 : 5 });
            cell.coin.alpha = 0.45; cell.label.alpha = 0.45;
            actionText.text = prize.jackpot ? `${prize.label} JACKPOT COIN! • ${prize.multiple}× BET` : `${prize.multiple}× LOCKED • RESPINS RESET TO THREE!`;
            winText.text = `LOCKED VALUE  $${(total / 100).toFixed(2)}`;
            if (prize.jackpot) {
              livesText.text = `${prize.label} JACKPOT • $${(cell.value / 100).toFixed(2)}`;
              for (let flash = 0; flash < 6; flash += 1) {
                cell.coin.alpha = flash % 2 ? 0.45 : 1;
                cell.label.alpha = flash % 2 ? 0.55 : 1;
                cell.coin.scale.set(flash % 2 ? 1.14 : 1);
                await this.delay(145);
              }
              cell.coin.scale.set(1);
            } else await this.delay(330);
            cell.coin.alpha = 1; cell.label.alpha = 1;
          }
          first = false; lives = hits.length ? 3 : lives - 1;
          livesText.text = `RESPINS  ${"● ".repeat(lives)}${"○ ".repeat(3 - lives)}`; winText.text = `LOCKED VALUE  $${(total / 100).toFixed(2)}`;
          actionText.text = hits.length ? `${hits.length} NEW COIN${hits.length === 1 ? "" : "S"} • THREE LIVES RESTORED` : lives ? `NO COIN • ${lives} RESPIN${lives === 1 ? "" : "S"} REMAIN` : "FINAL RESPIN MISSED • VAULT SEALING";
          await this.delay(hits.length ? 850 : 1050);
        }
        if (cells.every((cell) => cell.locked)) { total += wagerUnits * 500; livesText.text = "GRAND VAULT FILLED • +500×"; actionText.text = "EVERY CHAMBER LOCKED • GRAND VAULT JACKPOT"; }
        else { livesText.text = "VAULT SEALED • EVERY LOCKED COIN PAYS"; actionText.text = `${cells.filter((cell) => cell.locked).length} OF 15 CHAMBERS LOCKED`; }
        winText.text = `LIVING VAULT WIN  $${(total / 100).toFixed(2)}`;
        const collect = this.featureButton("COLLECT VAULT WIN", 770); collect.button.on("pointertap", () => { overlay.destroy({ children: true }); resolve(total); }); overlay.addChild(collect.button, collect.label);
      });
    });
  }

  private featureShell(titleText: string, subtitleText: string): Container {
    const overlay = new Container();
    const shade = new Graphics().rect(0, 0, CABINET_WIDTH, CABINET_HEIGHT).fill({ color: 0x020104, alpha: 0.94 });
    const panel = new Graphics().roundRect(286, 72, 1100, 798, 36).fill({ color: 0x14051f }).stroke({ color: GOLD, width: 8 });
    const title = this.centerText(titleText, 66, GOLD, 150); title.style.stroke = { color: 0x4b126d, width: 9 };
    const subtitle = this.centerText(subtitleText, 23, 0xe7c9f7, 214);
    overlay.addChild(shade, panel, title, subtitle);
    this.fitOverlayForCurrentLayout(overlay);
    return overlay;
  }

  private fitOverlayForCurrentLayout(overlay: Container): void {
    if (!this.portraitMode) return;
    const scale = 720 / CABINET_WIDTH;
    overlay.scale.set(scale);
    overlay.position.set(0, 430);
  }

  private centerText(text: string, size: number, fill: number, y: number): Text {
    const label = new Text({ text, style: { fontFamily: "Arial Black, Arial", fontSize: size, fontWeight: "bold", fill, align: "center", letterSpacing: 2 } }); label.anchor.set(0.5); label.position.set(836, y); return label;
  }

  private featureButton(text: string, y: number): { button: Graphics; label: Text } {
    const button = new Graphics().roundRect(636, y, 400, 62, 15).fill({ color: 0xefbd4d }).stroke({ color: 0xfff0a0, width: 4 }); button.eventMode = "static"; button.cursor = "pointer";
    const label = this.centerText(text, 22, 0x241000, y + 31); return { button, label };
  }

  private randomInt(max: number): number { const values = new Uint32Array(1); crypto.getRandomValues(values); return values[0]! % max; }
  private delay(ms: number): Promise<void> { return new Promise((resolve) => window.setTimeout(resolve, ms)); }

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
    this.addChild(this.backgroundLayer, this.portraitShell, this.energyLayer, this.reelLayer, this.controlLayer, this.headerLayer);
    const cabinet = Sprite.from(
      new URL("../../assets/beard-bank-2040-cabinet.png", import.meta.url).href,
    );
    cabinet.width = CABINET_WIDTH;
    cabinet.height = CABINET_HEIGHT;
    this.backgroundLayer.addChild(cabinet);

    this.buildPortraitShell();

    this.buildReels();
    this.buildLivingEnergy();
    this.buildControls();
  }

  private buildReels(): void {
    const blackout = new Graphics()
      .roundRect(this.reelBounds.x - 5, this.reelBounds.y - 5, this.reelBounds.width + 10, this.reelBounds.height + 10, 16)
      .fill({ color: 0x050209, alpha: 0.99 })
      .stroke({ color: GOLD, width: 5, alpha: 0.9 });

    const purpleWell = new Graphics()
      .roundRect(this.reelBounds.x + 4, this.reelBounds.y + 4, this.reelBounds.width - 8, this.reelBounds.height - 8, 12)
      .fill({ color: 0x10051a, alpha: 1 })
      .stroke({ color: PURPLE, width: 3, alpha: 0.7 });

    this.reelLayer.addChild(blackout, purpleWell);
    this.reelSet = new ReelSet(this.reelBounds.width - 16, this.reelBounds.height - 16);
    this.reelSet.position.set(this.reelBounds.x + 8, this.reelBounds.y + 8);
    this.reelLayer.addChild(this.reelSet);

    const glass = new Graphics()
      .moveTo(this.reelBounds.x + 18, this.reelBounds.y + 12)
      .lineTo(this.reelBounds.x + this.reelBounds.width * 0.72, this.reelBounds.y + 12)
      .lineTo(this.reelBounds.x + this.reelBounds.width * 0.54, this.reelBounds.y + 82)
      .lineTo(this.reelBounds.x + 18, this.reelBounds.y + 82)
      .closePath()
      .fill({ color: 0xffffff, alpha: 0.045 });
    this.reelLayer.addChild(glass);
  }

  private rebuildReels(): void {
    this.reelLayer.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.buildReels();
  }

  private buildPortraitShell(): void {
    const backdrop = Sprite.from(new URL("../../assets/beard-bank-mobile-vault.png", import.meta.url).href);
    backdrop.width = 720; backdrop.height = 1500;
    const titlePlate = new Graphics().roundRect(74, 452, 572, 102, 20).fill({ color: 0x0a0411, alpha: 0.9 }).stroke({ color: GOLD, width: 4 });
    const title = new Text({ text: "BEARD BANK", style: { fontFamily: "Georgia, serif", fontSize: 50, fontWeight: "bold", fill: GOLD, stroke: { color: 0x18051f, width: 7 }, letterSpacing: 3 } });
    title.anchor.set(0.5); title.position.set(360, 487);
    const subtitle = new Text({ text: "THE LIVING VAULT", style: { fontFamily: "Arial Black, Arial", fontSize: 15, fill: 0xe6c4ff, letterSpacing: 5 } });
    subtitle.anchor.set(0.5); subtitle.position.set(360, 530);
    const jackpotPlate = new Graphics().roundRect(62, 565, 596, 38, 12).fill({ color: 0x08030d, alpha: 0.92 }).stroke({ color: 0x8a5b24, width: 2 });
    const jackpots = new Text({ text: "MINI 10×     MINOR 25×     MAJOR 100×     GRAND 500×", style: { fontFamily: "Arial Black, Arial", fontSize: 13, fill: 0xffe6a2 } });
    jackpots.anchor.set(0.5); jackpots.position.set(360, 584);
    this.chaseHeist = new Text({ text: "●  3 COINS: VAULT HEIST", style: { fontFamily: "Arial Black, Arial", fontSize: 13, fill: 0xffd86b } });
    this.chaseHeist.position.set(62, 612);
    this.chaseSpins = new Text({ text: "▣  STACKED DOORS: FREE SPINS", style: { fontFamily: "Arial Black, Arial", fontSize: 13, fill: 0x9dffdb } });
    this.chaseSpins.position.set(388, 612);
    const meterTrack = new Graphics().roundRect(38, 642, 644, 12, 6).fill({ color: 0x16091f }).stroke({ color: 0xb078cf, width: 2 });
    this.vaultMeterFill = new Graphics();
    this.vaultMeterText = new Text({ text: "LIVING VAULT  0 / 30 CHARGES", style: { fontFamily: "Arial Black, Arial", fontSize: 14, fill: 0xe7c9f7, letterSpacing: 2 } });
    this.vaultMeterText.anchor.set(0.5); this.vaultMeterText.position.set(360, 670);
    const reelFrame = new Graphics().roundRect(48, 640, 624, 578, 22).fill({ color: 0x020104, alpha: 0.55 }).stroke({ color: GOLD, width: 4 });
    const controlDeck = new Graphics().roundRect(34, 1232, 652, 248, 26).fill({ color: 0x07020c, alpha: 0.94 }).stroke({ color: 0xb67a29, width: 3 });
    this.portraitShell.addChild(backdrop, titlePlate, title, subtitle, jackpotPlate, jackpots, this.chaseHeist, this.chaseSpins, meterTrack, this.vaultMeterFill, this.vaultMeterText, reelFrame, controlDeck);
    this.portraitShell.visible = false;
  }

  private buildLivingEnergy(): void {
    this.energy
      .ellipse(836, 213, 170, 190)
      .stroke({ color: PURPLE, width: 9, alpha: 0.34 });
    this.energyLayer.addChild(this.energy);
    this.setVaultCharge(0);
  }

  private buildControls(): void {
    const deck = new Graphics()
      .roundRect(148, 870, 1380, 58, 13)
      .fill({ color: 0x08030d, alpha: 0.96 })
      .stroke({ color: 0xc9942f, width: 3, alpha: 0.9 });
    this.controlLayer.addChild(deck);

    const credit = this.readout("CREDIT", "$100.00", 170, 878, 250);
    const bet = this.readout("BET", "$1.00", 438, 878, 250);
    const win = this.readout("WIN", "$0.00", 706, 878, 270);
    this.creditContainer = credit.container;
    this.betContainer = bet.container;
    this.winContainer = win.container;
    this.creditValue = credit.value;
    this.betValue = bet.value;
    this.winValue = win.value;
    this.controlLayer.addChild(credit.container, bet.container, win.container);

    const statusBox = new Graphics()
      .roundRect(984, 879, 216, 40, 10)
      .fill({ color: 0x1e0b2d, alpha: 0.97 })
      .stroke({ color: 0x8f4bc2, width: 2 });
    this.statusBox = statusBox;
    this.statusValue = new Text({
      text: "READY",
      style: { fontFamily: "Arial Black, Arial", fontSize: 17, fontWeight: "bold", fill: 0xd8a5ff, letterSpacing: 1 },
    });
    this.statusValue.anchor.set(0.5);
    this.statusValue.position.set(1092, 899);

    this.betMinusButton = new Graphics().roundRect(1208, 876, 42, 46, 11)
      .fill({ color: 0x351044, alpha: 1 }).stroke({ color: 0xd898ff, width: 3 });
    this.betPlusButton = new Graphics().roundRect(1256, 876, 42, 46, 11)
      .fill({ color: 0x351044, alpha: 1 }).stroke({ color: 0xd898ff, width: 3 });
    const betMinusText = new Text({ text: "−", style: { fontFamily: "Arial Black", fontSize: 29, fill: 0xffe7a0 } });
    betMinusText.anchor.set(0.5); betMinusText.position.set(1229, 899);
    const betPlusText = new Text({ text: "+", style: { fontFamily: "Arial Black", fontSize: 27, fill: 0xffe7a0 } });
    betPlusText.anchor.set(0.5); betPlusText.position.set(1277, 899);
    this.betMinusText = betMinusText;
    this.betPlusText = betPlusText;

    this.spinButton = new Graphics()
      .roundRect(1432, 873, 88, 50, 13)
      .fill({ color: 0xffc744, alpha: 0.88 })
      .stroke({ color: 0xffef9d, width: 4, alpha: 0.95 });

    this.spinText = new Text({
      text: "SPIN",
      style: {
        fontFamily: "Arial Black, Arial",
        fontSize: 22,
        fontWeight: "bold",
        fill: 0x2b1300,
        letterSpacing: 5,
        stroke: { color: 0xffe793, width: 3 },
      },
    });
    this.spinText.anchor.set(0.5);
    this.spinText.position.set(1476, 899);

    this.autoButton = new Graphics().roundRect(1306, 873, 118, 50, 13)
      .fill({ color: 0x301041, alpha: 0.96 }).stroke({ color: 0xd898ff, width: 3 });
    this.autoText = new Text({ text: "AUTO", style: { fontFamily: "Arial Black, Arial", fontSize: 16, fontWeight: "bold", fill: 0xffe7a0, align: "center" } });
    this.autoText.anchor.set(0.5); this.autoText.position.set(1365, 899);
    this.controlLayer.addChild(statusBox, this.statusValue, this.betMinusButton, this.betPlusButton, betMinusText, betPlusText, this.spinButton, this.spinText, this.autoButton, this.autoText);

    this.homeButton = new Graphics().roundRect(20, 20, 170, 48, 12).fill({ color: 0x13051f, alpha: 0.92 }).stroke({ color: GOLD, width: 3 });
    this.homeLabel = new Text({ text: "CASINO LOBBY", style: { fontFamily: "Arial Black, Arial", fontSize: 16, fontWeight: "bold", fill: GOLD } });
    this.homeLabel.anchor.set(0.5); this.homeLabel.position.set(105, 44);
    this.infoButton = new Graphics().roundRect(1432, 20, 220, 48, 12).fill({ color: 0x13051f, alpha: 0.96 }).stroke({ color: GOLD, width: 3 });
    this.infoLabel = new Text({ text: "i  PAYTABLE", style: { fontFamily: "Arial Black, Arial", fontSize: 17, fontWeight: "bold", fill: GOLD } });
    this.infoLabel.anchor.set(0.5); this.infoLabel.position.set(1542, 44);
    this.headerLayer.addChild(this.homeButton, this.homeLabel, this.infoButton, this.infoLabel);
    this.buildBadge = new Text({ text: "BEARD BANK V52", style: { fontFamily: "Arial Black, Arial", fontSize: 12, fontWeight: "bold", fill: 0x9dffdb, letterSpacing: 2 } });
    this.buildBadge.anchor.set(0.5); this.buildBadge.position.set(836, 382); this.headerLayer.addChild(this.buildBadge);
  }

  private layoutPortrait(): void {
    for (const layer of [this.reelLayer, this.energyLayer, this.controlLayer, this.headerLayer]) {
      layer.scale.set(1); layer.position.set(0, 0); layer.alpha = 1;
    }
    this.energyLayer.visible = false;

    this.homeButton.clear().roundRect(18, 18, 190, 54, 14).fill({ color: 0x13051f }).stroke({ color: GOLD, width: 3 });
    this.homeLabel.position.set(113, 45);
    this.infoButton.clear().roundRect(512, 18, 190, 54, 14).fill({ color: 0x13051f }).stroke({ color: GOLD, width: 3 });
    this.infoLabel.position.set(607, 45);
    this.buildBadge.text = "BEARD BANK V52"; this.buildBadge.position.set(360, 92);

    // The readouts are drawn with landscape-local coordinates. Translate them
    // into one clean row below the reels instead of letting them overlap it.
    this.creditContainer.position.set(-90, 590);
    this.betContainer.position.set(-64, 590);
    this.winContainer.position.set(-38, 590);
    this.creditContainer.scale.set(0.75);
    this.betContainer.scale.set(0.75);
    this.winContainer.scale.set(0.75);

    this.statusBox.clear().roundRect(52, 1318, 616, 46, 14).fill({ color: 0x160820 }).stroke({ color: 0xa65fd0, width: 2 });
    this.statusValue.position.set(360, 1341); this.statusValue.style.fontSize = 19;

    this.betMinusButton.clear().roundRect(52, 1384, 94, 74, 18).fill({ color: 0x26102f }).stroke({ color: 0xc884ee, width: 3 });
    this.betMinusText.position.set(99, 1421); this.betMinusText.style.fontSize = 38;
    this.autoButton.clear().roundRect(166, 1391, 112, 60, 16).fill({ color: 0x24102d }).stroke({ color: 0xb878dc, width: 3 });
    this.autoText.position.set(222, 1421); this.autoText.style.fontSize = 13;
    this.spinButton.clear().circle(430, 1421, 48).fill({ color: 0xffcb4f }).stroke({ color: 0xfff1a6, width: 5 });
    this.spinText.position.set(430, 1421); this.spinText.style.fontSize = 21;
    this.betPlusButton.clear().roundRect(574, 1384, 94, 74, 18).fill({ color: 0x26102f }).stroke({ color: 0xc884ee, width: 3 });
    this.betPlusText.position.set(621, 1421); this.betPlusText.style.fontSize = 36;

    const deck = this.controlLayer.children[0];
    if (deck) deck.visible = false;
  }

  private layoutLandscape(): void {
    this.energyLayer.visible = true;
    const deck = this.controlLayer.children[0]; if (deck) deck.visible = true;
    this.creditContainer.position.set(0); this.betContainer.position.set(0); this.winContainer.position.set(0);
    this.creditContainer.scale.set(1); this.betContainer.scale.set(1); this.winContainer.scale.set(1);
    this.statusBox.clear().roundRect(984, 879, 216, 40, 10).fill({ color: 0x1e0b2d }).stroke({ color: 0x8f4bc2, width: 2 });
    this.statusValue.position.set(1092, 899); this.statusValue.style.fontSize = 17;
    this.betMinusButton.clear().roundRect(1208, 876, 42, 46, 11).fill({ color: 0x351044 }).stroke({ color: 0xd898ff, width: 3 });
    this.betMinusText.position.set(1229, 899); this.betMinusText.style.fontSize = 29;
    this.betPlusButton.clear().roundRect(1256, 876, 42, 46, 11).fill({ color: 0x351044 }).stroke({ color: 0xd898ff, width: 3 });
    this.betPlusText.position.set(1277, 899); this.betPlusText.style.fontSize = 27;
    this.spinButton.clear().roundRect(1432, 873, 88, 50, 13).fill({ color: 0xffc744, alpha: 0.88 }).stroke({ color: 0xffef9d, width: 4 });
    this.spinText.position.set(1476, 899); this.spinText.style.fontSize = 22;
    this.autoButton.clear().roundRect(1306, 873, 118, 50, 13).fill({ color: 0x301041 }).stroke({ color: 0xd898ff, width: 3 });
    this.autoText.position.set(1365, 899); this.autoText.style.fontSize = 16;
    this.homeButton.clear().roundRect(20, 20, 170, 48, 12).fill({ color: 0x13051f, alpha: 0.92 }).stroke({ color: GOLD, width: 3 });
    this.homeLabel.position.set(105, 44);
    this.infoButton.clear().roundRect(1432, 20, 220, 48, 12).fill({ color: 0x13051f }).stroke({ color: GOLD, width: 3 });
    this.infoLabel.position.set(1542, 44);
    this.buildBadge.text = "BEARD BANK V52"; this.buildBadge.position.set(836, 382);
  }

  private readout(label: string, initial: string, x: number, y: number, width: number): { container: Container; value: Text } {
    const container = new Container();
    const box = new Graphics()
      .roundRect(x, y, width, 42, 9)
      .fill({ color: 0x0b0511, alpha: 1 })
      .stroke({ color: 0x5d316f, width: 2 });
    const labelText = new Text({
      text: label,
      style: { fontFamily: "Arial", fontSize: 13, fontWeight: "bold", fill: 0xcdbb94, letterSpacing: 1 },
    });
    labelText.position.set(x + 16, y + 5);
    const value = new Text({
      text: initial,
      style: { fontFamily: "Arial Black, Arial", fontSize: 21, fontWeight: "bold", fill: 0xffe4a0 },
    });
    value.position.set(x + width - 18, y + 10);
    value.anchor.set(1, 0);
    container.addChild(box, labelText, value);
    return { container, value };
  }

  private readonly animate = (ticker: Ticker): void => {
    this.elapsed += ticker.deltaMS / 1000;
    const pulse = (Math.sin(this.elapsed * 2.2) + 1) / 2;
    this.energy.alpha = 0.45 + pulse * 0.55;
    this.energy.scale.set(0.985 + pulse * 0.02);
    this.energy.pivot.set(836, 213);
    this.energy.position.set(836, 213);
  };
}
