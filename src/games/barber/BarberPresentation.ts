import { FeatureDirector } from "../../engine/FeatureDirector";

export interface BarberBuilderActor {
  readonly node: HTMLElement;
  readonly reel: number;
}

export class BarberPresentation {
  private readonly machine: HTMLElement;
  private readonly director: FeatureDirector;
  private readonly cinematicLayer: HTMLElement;

  public constructor(private readonly root: HTMLElement) {
    const machine = root.querySelector<HTMLElement>(".barber-machine");
    if (!machine) throw new Error("Big Bad Barber machine root is missing.");
    this.machine = machine;
    this.director = new FeatureDirector(machine);
    this.cinematicLayer = this.ensureCinematicLayer();
  }

  public setAnticipation(active: boolean, reel = 4): void {
    this.machine.classList.toggle("barber-anticipating", active);
    this.machine.style.setProperty("--barber-anticipation-reel", String(reel));
  }

  public async builderArrive(reel: number): Promise<BarberBuilderActor> {
    const source = this.reelPoint(reel);
    const target = this.fortPoint(reel);
    const actor = document.createElement("div");
    actor.className = "barber-builder-foreman";
    actor.innerHTML = '<span class="builder-hardhat"></span><span class="builder-beard"></span><span class="builder-hammer"></span>';
    actor.style.left = `${source.x}px`;
    actor.style.top = `${source.y}px`;
    this.cinematicLayer.appendChild(actor);

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const animation = actor.animate([
      { transform: "translate(-50%,-50%) scale(.5)", opacity: 0 },
      { transform: "translate(-50%,-50%) scale(1.08)", opacity: 1, offset: .14 },
      { transform: `translate(calc(-50% + ${dx * .72}px),calc(-50% + ${dy * .72}px)) scale(1)`, opacity: 1, offset: .78 },
      { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.9)`, opacity: 1 },
    ], { duration: 760, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
    await animation.finished;
    return { node: actor, reel };
  }

  public async builderFinish(actor: BarberBuilderActor): Promise<void> {
    const fort = this.root.querySelector<HTMLElement>(`[data-fort="${actor.reel}"]`);
    if (!fort) {
      actor.node.remove();
      return;
    }
    fort.classList.add("fort-construction");
    const hammer = actor.node.querySelector<HTMLElement>(".builder-hammer");
    for (let hit = 0; hit < 3; hit += 1) {
      if (hammer) {
        const animation = hammer.animate([
          { transform: "rotate(-34deg)" },
          { transform: "rotate(24deg)", offset: .55 },
          { transform: "rotate(-20deg)" },
        ], { duration: 210, easing: "ease-in-out" });
        await animation.finished;
      }
      this.director.pulse("gold", 180);
      await this.director.shake("soft", 115);
    }
    fort.classList.remove("fort-construction");
    fort.classList.add("fort-built-flash");
    window.setTimeout(() => fort.classList.remove("fort-built-flash"), 620);
    await actor.node.animate([
      { opacity: 1 },
      { opacity: 0 },
    ], { duration: 330, easing: "ease-in", fill: "forwards" }).finished.catch(() => undefined);
    actor.node.remove();
  }

  public targetFort(reel: number): void {
    this.clearTarget();
    this.machine.classList.add("barber-danger");
    const fort = this.root.querySelector<HTMLElement>(`[data-fort="${reel}"]`);
    fort?.classList.add("barber-target-lock");
    const reels = this.root.querySelector<HTMLElement>("[data-barber-reels]");
    reels?.style.setProperty("--barber-target-reel", String(reel));
    reels?.classList.add("barber-target-reel");
  }

  public clearTarget(): void {
    this.machine.classList.remove("barber-danger");
    this.root.querySelectorAll<HTMLElement>(".barber-target-lock").forEach((node) => node.classList.remove("barber-target-lock"));
    this.root.querySelector<HTMLElement>("[data-barber-reels]")?.classList.remove("barber-target-reel");
  }

  public async celebrateWin(fromUnits: number, toUnits: number, wagerUnits: number): Promise<void> {
    const node = this.root.querySelector<HTMLElement>("[data-barber-win]");
    this.director.pulse("gold", toUnits >= wagerUnits * 10 ? 900 : 520);
    const reels = this.root.querySelector<HTMLElement>("[data-barber-reels]");
    if (reels) this.director.burst(reels, "✦", toUnits >= wagerUnits * 10 ? 26 : 14, "gold-particle");
    if (node) {
      await this.director.countUp(node, fromUnits, toUnits, toUnits >= wagerUnits * 10 ? 980 : 650, (value) => `$${(value / 100).toFixed(2)}`);
    }
    await this.director.shake(toUnits >= wagerUnits * 10 ? "medium" : "soft", toUnits >= wagerUnits * 10 ? 390 : 220);
  }

  public barberTaunt(random: () => number): string {
    const lines = [
      "TIME FOR A TRIM!",
      "LET'S CLEAN THIS UP!",
      "THAT BEARD'S TOO COMFORTABLE!",
      "CLIPPERS ARE HOT!",
      "WHO BUILT THIS THING?",
      "HOLD STILL, LEGEND!",
    ];
    return lines[Math.min(lines.length - 1, Math.floor(random() * lines.length))]!;
  }

  public rewardBurst(host: HTMLElement): void {
    this.director.burst(host, "✦", 22, "gold-particle");
    this.director.pulse("gold", 760);
  }

  private ensureCinematicLayer(): HTMLElement {
    const existing = this.machine.querySelector<HTMLElement>("[data-barber-cinematic-layer]");
    if (existing) return existing;
    const layer = document.createElement("div");
    layer.className = "barber-cinematic-layer";
    layer.dataset.barberCinematicLayer = "";
    this.machine.appendChild(layer);
    return layer;
  }

  private reelPoint(reel: number): { x: number; y: number } {
    const machineRect = this.machine.getBoundingClientRect();
    const reelsRect = this.root.querySelector<HTMLElement>("[data-barber-reels]")?.getBoundingClientRect();
    if (!reelsRect) return { x: machineRect.width / 2, y: machineRect.height / 2 };
    return {
      x: reelsRect.left - machineRect.left + reelsRect.width * ((reel + .5) / 5),
      y: reelsRect.top - machineRect.top + reelsRect.height * .53,
    };
  }

  private fortPoint(reel: number): { x: number; y: number } {
    const machineRect = this.machine.getBoundingClientRect();
    const fortRect = this.root.querySelector<HTMLElement>(`[data-fort="${reel}"]`)?.getBoundingClientRect();
    if (!fortRect) return { x: machineRect.width / 2, y: machineRect.height * .25 };
    return {
      x: fortRect.left - machineRect.left + fortRect.width / 2,
      y: fortRect.top - machineRect.top + fortRect.height / 2,
    };
  }
}
