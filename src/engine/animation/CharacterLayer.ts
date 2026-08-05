export interface CharacterMoveOptions {
  duration?: number;
  easing?: string;
  facing?: "left" | "right" | "auto";
}

export class CharacterLayer {
  public readonly element: HTMLDivElement;

  public constructor(private readonly host: HTMLElement) {
    const existing = host.querySelector<HTMLDivElement>(":scope > .casino-character-layer");
    this.element = existing ?? document.createElement("div");
    if (!existing) {
      this.element.className = "casino-character-layer";
      this.element.setAttribute("aria-hidden", "true");
      host.appendChild(this.element);
    }
    host.classList.add("casino-layer-host");
  }

  public create(className: string, content: string): HTMLElement {
    const actor = document.createElement("div");
    actor.className = `casino-character ${className}`;
    actor.innerHTML = content;
    this.element.appendChild(actor);
    return actor;
  }

  public position(actor: HTMLElement, x: number, y: number): void {
    actor.style.transform = `translate3d(${x}px,${y}px,0)`;
  }

  public async move(actor: HTMLElement, from: DOMPoint, to: DOMPoint, options: CharacterMoveOptions = {}): Promise<void> {
    const duration = options.duration ?? 900;
    const facing = options.facing === "auto" || !options.facing ? (to.x >= from.x ? "right" : "left") : options.facing;
    actor.dataset.facing = facing;
    const animation = actor.animate(
      [
        { transform: `translate3d(${from.x}px,${from.y}px,0)` },
        { transform: `translate3d(${to.x}px,${to.y}px,0)` },
      ],
      { duration, easing: options.easing ?? "cubic-bezier(.2,.75,.25,1)", fill: "forwards" },
    );
    await animation.finished.catch(() => undefined);
  }

  public clear(): void { this.element.replaceChildren(); }
  public destroy(): void { this.element.remove(); this.host.classList.remove("casino-layer-host"); }
}
