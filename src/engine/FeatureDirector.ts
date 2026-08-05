export const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

export class FeatureDirector {
  public constructor(private readonly cabinet: HTMLElement) {}

  public async shake(intensity: "soft" | "medium" | "hard" = "soft", duration = 280): Promise<void> {
    this.cabinet.classList.remove("cabinet-shake-soft", "cabinet-shake-medium", "cabinet-shake-hard");
    void this.cabinet.offsetWidth;
    this.cabinet.classList.add(`cabinet-shake-${intensity}`);
    await sleep(duration);
    this.cabinet.classList.remove(`cabinet-shake-${intensity}`);
  }

  public burst(host: HTMLElement, glyph: string, count = 12, className = "feature-particle"): void {
    const layer = document.createElement("div");
    layer.className = "feature-particle-layer";
    const rect = host.getBoundingClientRect();
    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement("i");
      particle.className = className;
      particle.textContent = glyph;
      particle.style.setProperty("--particle-x", `${20 + Math.random() * Math.max(20, rect.width - 40)}px`);
      particle.style.setProperty("--particle-y", `${20 + Math.random() * Math.max(20, rect.height - 40)}px`);
      particle.style.setProperty("--particle-dx", `${-90 + Math.random() * 180}px`);
      particle.style.setProperty("--particle-dy", `${-80 - Math.random() * 140}px`);
      particle.style.setProperty("--particle-delay", `${Math.random() * 160}ms`);
      layer.appendChild(particle);
    }
    host.appendChild(layer);
    window.setTimeout(() => layer.remove(), 1500);
  }

  public async countUp(node: HTMLElement, from: number, to: number, duration = 700, formatter: (value: number) => string = String): Promise<void> {
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const frame = (now: number): void => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4);
        node.textContent = formatter(Math.round(from + (to - from) * eased));
        if (t >= 1) resolve(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }
}
