import { Application as PixiApplication, Color } from "pixi.js";
import { GameScene } from "../scenes/GameScene";

export class Application {
  private readonly pixi: PixiApplication;

  constructor() {
    this.pixi = new PixiApplication();
  }

  public async initialize(): Promise<void> {
    await this.pixi.init({
      resizeTo: window,
      background: new Color(0x12081f),
      antialias: true,
    });

    document.getElementById("app")?.appendChild(this.pixi.canvas);

    const gameScene = new GameScene(this.pixi);
    gameScene.initialize();
  }
}