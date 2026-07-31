import { Application as PixiApplication, Assets, Color } from "pixi.js";
import { GameScene } from "../scenes/GameScene";

const cabinetAssetUrl = new URL(
  "../../assets/beard-bank-2040-cabinet.png",
  import.meta.url,
).href;

const symbolAssetUrls = [
  "beard-coin",
  "oil",
  "crown",
  "comb",
  "vernon",
  "vault-door",
  "gold-crest",
].map(
  (name) =>
    new URL(
      `../../assets/concept-symbols/${name}.png`,
      import.meta.url,
    ).href,
);

export class Application {
  private readonly pixi: PixiApplication;

  constructor() {
    this.pixi = new PixiApplication();
  }

  public async initialize(): Promise<void> {
    await Promise.all([
      this.pixi.init({
        resizeTo: window,
        background: new Color(0x12081f),
        antialias: true,
      }),
      Assets.load([cabinetAssetUrl, ...symbolAssetUrls]),
    ]);

    document.getElementById("app")?.appendChild(this.pixi.canvas);

    const gameScene = new GameScene(this.pixi);
    gameScene.initialize();
  }
}