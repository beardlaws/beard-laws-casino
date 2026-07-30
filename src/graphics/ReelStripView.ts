import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
} from 'pixi.js';
import type { Grid, SymbolId } from '../types/GameTypes';

const symbolLabels: Readonly<Record<SymbolId, string>> = {
  oil: 'OIL',
  comb: 'COMB',
  razor: 'RAZOR',
  balm: 'BALM',
  key: 'KEY',
  crown: 'CROWN',
  vernon: 'VERNON',
  vault: 'VAULT',
  coin: 'BL',
};

export class ReelStripView {
  private readonly app = new Application();
  private readonly stageRoot = new Container();
  private initialized = false;
  private width = 900;
  private height = 470;

  public async mount(host: HTMLElement): Promise<void> {
    await this.app.init({
      width: this.width,
      height: this.height,
      antialias: true,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
    });

    this.app.canvas.classList.add('slot-canvas');
    host.replaceChildren(this.app.canvas);
    this.app.stage.addChild(this.stageRoot);
    this.initialized = true;

    const resizeObserver = new ResizeObserver(() => this.resize(host));
    resizeObserver.observe(host);
  }

  public renderGrid(grid: Grid): void {
    this.assertInitialized();
    this.stageRoot.removeChildren();

    const reelWidth = this.width / grid.length;
    const rows = grid[0]?.length ?? 3;
    const rowHeight = this.height / rows;

    const background = new Graphics()
      .roundRect(0, 0, this.width, this.height, 18)
      .fill({ color: 0x071a36 })
      .stroke({ color: 0x7650c9, width: 5 });
    this.stageRoot.addChild(background);

    grid.forEach((reel, reelIndex) => {
      reel.forEach((symbol, rowIndex) => {
        const x = reelIndex * reelWidth;
        const y = rowIndex * rowHeight;
        const card = new Graphics()
          .roundRect(x + 7, y + 7, reelWidth - 14, rowHeight - 14, 16)
          .fill({ color: this.symbolColor(symbol) })
          .stroke({ color: 0xd2b160, width: 2 });

        const label = new Text({
          text: symbolLabels[symbol],
          style: new TextStyle({
            fill: 0xffe79a,
            fontFamily: 'Georgia',
            fontSize: Math.min(34, reelWidth * 0.16),
            fontWeight: 'bold',
            align: 'center',
          }),
        });
        label.anchor.set(0.5);
        label.x = x + reelWidth / 2;
        label.y = y + rowHeight / 2;

        this.stageRoot.addChild(card, label);
      });
    });
  }

  public async spinTo(grid: Grid): Promise<void> {
    this.assertInitialized();

    const duration = 1_150;
    const started = performance.now();

    await new Promise<void>((resolve) => {
      const animate = (now: number): void => {
        const progress = Math.min(1, (now - started) / duration);
        const intensity = Math.sin(progress * Math.PI);
        this.stageRoot.y = Math.sin(progress * 70) * 10 * intensity;
        this.stageRoot.alpha = 1 - intensity * 0.16;

        if (progress < 1) {
          requestAnimationFrame(animate);
          return;
        }

        this.stageRoot.y = 0;
        this.stageRoot.alpha = 1;
        this.renderGrid(grid);
        resolve();
      };

      requestAnimationFrame(animate);
    });
  }

  private resize(host: HTMLElement): void {
    const nextWidth = Math.max(500, Math.floor(host.clientWidth));
    const nextHeight = Math.max(320, Math.floor(nextWidth * 0.52));
    if (nextWidth === this.width && nextHeight === this.height) {
      return;
    }
    this.width = nextWidth;
    this.height = nextHeight;
    this.app.renderer.resize(this.width, this.height);
  }

  private symbolColor(symbol: SymbolId): number {
    if (symbol === 'coin') return 0x9c681d;
    if (symbol === 'vernon') return 0x5d2d70;
    if (symbol === 'vault') return 0x394657;
    if (symbol === 'key' || symbol === 'crown') return 0x6e471c;
    return 0x27162f;
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error('ReelStripView must be mounted before use.');
    }
  }
}
