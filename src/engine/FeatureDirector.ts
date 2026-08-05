import { CabinetEffects, type CabinetImpact } from "./animation/CabinetEffects";
import { CharacterLayer } from "./animation/CharacterLayer";
import { FeatureTimeline } from "./animation/FeatureTimeline";

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

export class FeatureDirector {
  public readonly timeline = new FeatureTimeline();
  public readonly characters: CharacterLayer;
  private readonly cabinetEffects: CabinetEffects;

  public constructor(cabinet: HTMLElement) {
    this.cabinetEffects = new CabinetEffects(cabinet);
    this.characters = new CharacterLayer(cabinet);
  }

  public shake(intensity: CabinetImpact = "soft", duration = 280): Promise<void> {
    return this.cabinetEffects.impact(intensity, duration);
  }

  public pulse(tone: "gold" | "cosmic" | "rose" = "gold", duration = 520): void {
    this.cabinetEffects.pulse(tone, duration);
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
