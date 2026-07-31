import {
  Application as PixiApplication,
  Container,
} from "pixi.js";
import { Cabinet } from "../graphics/Cabinet";

export class GameScene {
  private readonly root = new Container();
  private readonly cabinet = new Cabinet();

  constructor(private readonly app: PixiApplication) {}

  public initialize(): void {
    this.root.addChild(this.cabinet);
    this.app.stage.addChild(this.root);

    this.resize(
      this.app.renderer.width,
      this.app.renderer.height,
    );

    window.addEventListener("resize", this.handleResize);
  }

  private readonly handleResize = (): void => {
    this.resize(
      this.app.renderer.width,
      this.app.renderer.height,
    );
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