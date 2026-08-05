export type CabinetImpact = "soft" | "medium" | "hard";

export class CabinetEffects {
  public constructor(private readonly cabinet: HTMLElement) {}

  public async impact(intensity: CabinetImpact = "soft", duration = 260): Promise<void> {
    const classes = ["cabinet-impact-soft", "cabinet-impact-medium", "cabinet-impact-hard"];
    this.cabinet.classList.remove(...classes);
    void this.cabinet.offsetWidth;
    this.cabinet.classList.add(`cabinet-impact-${intensity}`);
    await new Promise<void>((resolve) => window.setTimeout(resolve, duration));
    this.cabinet.classList.remove(`cabinet-impact-${intensity}`);
  }

  public pulse(tone: "gold" | "cosmic" | "rose" = "gold", duration = 520): void {
    this.cabinet.dataset.cabinetPulse = tone;
    window.setTimeout(() => delete this.cabinet.dataset.cabinetPulse, duration);
  }
}
