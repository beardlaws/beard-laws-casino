import { FeatureDirector } from "../../engine/FeatureDirector";
import type { MeghCascadeResolution } from "./MeghCascadeRuntime";

export interface MeghAnimationRuntimeOptions {
  readonly rows: number;
  readonly render: (grid: MeghCascadeResolution["grid"]) => void;
  readonly wait: (ms: number) => Promise<void>;
}

export interface MeghFeatureActorOptions {
  readonly ufoArt: string;
  readonly goatArt: string;
  readonly sound: (cue: string) => void;
}

const nodeFor = (host: HTMLElement, key: string): HTMLElement | null =>
  host.querySelector<HTMLElement>(`[data-cell="${key}"]`);

const centerInHost = (host: HTMLElement, node: HTMLElement): DOMPoint => {
  const hostRect = host.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  return new DOMPoint(
    rect.left - hostRect.left + rect.width / 2,
    rect.top - hostRect.top + rect.height / 2,
  );
};

const rowPitch = (host: HTMLElement, rows: number): number => {
  const rect = host.getBoundingClientRect();
  return rect.height > 0 ? rect.height / rows : 96;
};

export const meghDropDuration = (distanceRows: number): number => {
  const distance = Math.max(1, distanceRows);
  return Math.round(390 + Math.sqrt(distance) * 155);
};

export class MeghAnimationRuntime {
  public constructor(
    private readonly host: HTMLElement,
    private readonly options: MeghAnimationRuntimeOptions,
  ) {}

  public async animateCascade(
    resolution: MeghCascadeResolution,
    config: { animateRemoval?: boolean; holePauseMs?: number } = {},
  ): Promise<void> {
    const removedNodes = [...resolution.removed]
      .map((key) => nodeFor(this.host, key))
      .filter((node): node is HTMLElement => Boolean(node));

    this.host.classList.add("megh-stage-active", "megh-gravity-running");

    if (config.animateRemoval ?? true) {
      await Promise.all(removedNodes.map((node, index) => node.animate(
        [
          { transform: "scale(1)", opacity: 1, filter: "brightness(1)" },
          { transform: "scale(.9)", opacity: .95, filter: "brightness(1.6)", offset: .36 },
          { transform: "scale(.34) rotate(-5deg)", opacity: .4, filter: "brightness(2) blur(1px)", offset: .72 },
          { transform: "scale(.02)", opacity: 0, filter: "brightness(2.3) blur(4px)" },
        ],
        {
          duration: 430,
          delay: index * 38,
          easing: "cubic-bezier(.25,.05,.45,1)",
          fill: "forwards",
        },
      ).finished.catch(() => undefined)));
    }

    removedNodes.forEach((node) => {
      node.classList.add("megh-runtime-hole");
      node.style.opacity = "0";
    });
    await this.options.wait(config.holePauseMs ?? 280);

    this.options.render(resolution.grid);
    const pitch = rowPitch(this.host, this.options.rows);
    const animations: Promise<unknown>[] = [];

    for (const motion of resolution.motions) {
      const node = nodeFor(this.host, `${motion.x}:${motion.y}`);
      if (!node) continue;
      const distanceRows = Math.max(0, motion.y - motion.fromY);
      if (distanceRows === 0 && !motion.isNew) continue;

      node.classList.add(motion.isNew ? "cascade-new-symbol" : "cascade-falling-symbol");
      const startY = -distanceRows * pitch;
      const duration = meghDropDuration(distanceRows);
      const delay = motion.x * 32 + Math.max(0, motion.y) * 15;

      animations.push(node.animate(
        [
          {
            transform: `translate3d(0,${startY}px,0) scale(1)`,
            opacity: motion.isNew ? 0 : .9,
            filter: motion.isNew ? "blur(3px) brightness(1.25)" : "blur(1.2px)",
            offset: 0,
          },
          {
            transform: `translate3d(0,${startY * .52}px,0) scale(1)`,
            opacity: 1,
            filter: "blur(.6px)",
            offset: .42,
          },
          {
            transform: "translate3d(0,8px,0) scale(1.015,.965)",
            opacity: 1,
            filter: "none",
            offset: .84,
          },
          {
            transform: "translate3d(0,-3px,0) scale(.995,1.01)",
            opacity: 1,
            filter: "none",
            offset: .94,
          },
          { transform: "translate3d(0,0,0) scale(1)", opacity: 1, filter: "none" },
        ],
        {
          duration,
          delay,
          easing: "cubic-bezier(.12,.62,.18,1)",
          fill: "both",
        },
      ).finished.catch(() => undefined));
    }

    await Promise.all(animations);
    this.host.classList.remove("megh-gravity-running");
    this.host.classList.add("megh-board-settled");
    window.dispatchEvent(new CustomEvent("casino:animation", { detail: { cue: "board-settle", game: "megh" } }));
    await this.options.wait(230);
    this.host.classList.remove("megh-board-settled", "megh-stage-active");
  }

  public async presentFeature(
    kind: "ufo-abduct" | "goat-eat",
    targetKeys: readonly string[],
    actorOptions: MeghFeatureActorOptions,
  ): Promise<void> {
    const nodes = targetKeys
      .map((key) => nodeFor(this.host, key))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length) return;

    const director = new FeatureDirector(this.host);
    this.host.classList.add("megh-feature-focus");
    nodes.forEach((node) => node.classList.add("event-target", "megh-feature-target"));

    try {
      if (kind === "ufo-abduct") {
        actorOptions.sound("ufo");
        await this.presentUfo(nodes, director, actorOptions);
      } else {
        actorOptions.sound("goat");
        await this.presentGoats(nodes, director, actorOptions);
      }
    } finally {
      nodes.forEach((node) => node.classList.remove("event-target", "megh-feature-target", "abducting-readable", "goat-marked-readable", "goat-eaten-readable"));
      this.host.classList.remove("megh-feature-focus");
      director.characters.clear();
    }
  }

  private async presentUfo(
    nodes: readonly HTMLElement[],
    director: FeatureDirector,
    options: MeghFeatureActorOptions,
  ): Promise<void> {
    const hostRect = this.host.getBoundingClientRect();
    const actorWidth = Math.max(98, Math.min(128, hostRect.width * .17));
    const actorHeight = actorWidth * .82;
    const hoverY = -Math.max(58, actorHeight * .48);
    const actor = director.characters.create(
      "megh-ufo-actor megh-ufo-runtime megh-board-ufo",
      `<img src="${options.ufoArt}" alt="Encore UFO"><i class="megh-ufo-beam"></i>`,
    );
    actor.style.setProperty("--megh-ufo-size", `${actorWidth}px`);

    let current = new DOMPoint(-actorWidth - 30, hoverY);
    director.characters.position(actor, current.x, current.y);
    actor.classList.add("is-travelling");
    await this.options.wait(100);

    for (const node of nodes) {
      const target = centerInHost(this.host, node);
      const hover = new DOMPoint(target.x - actorWidth / 2, hoverY);
      await director.characters.move(actor, current, hover, {
        duration: 620,
        easing: "cubic-bezier(.18,.72,.24,1)",
      });
      current = hover;
      actor.classList.remove("is-travelling");
      actor.classList.add("is-locking");
      this.host.classList.add("megh-anticipating");
      await this.options.wait(360);

      const nodeRect = node.getBoundingClientRect();
      const beamHeight = Math.max(96, target.y - hoverY - actorHeight * .38);
      actor.style.setProperty("--megh-beam-height", `${beamHeight}px`);
      actor.style.setProperty("--megh-beam-width", `${Math.max(46, nodeRect.width * .58)}px`);
      actor.classList.add("is-firing");
      node.classList.add("abducting-readable");
      options.sound("beam");
      window.dispatchEvent(new CustomEvent("casino:animation", { detail: { cue: "ufo-lock", game: "megh" } }));

      const lift = Math.max(110, target.y - hoverY - actorHeight * .25);
      await node.animate(
        [
          { transform: "translate3d(0,0,0) scale(1)", opacity: 1, filter: "brightness(1)" },
          { transform: `translate3d(0,-${Math.round(lift * .28)}px,0) scale(.92) rotate(3deg)`, opacity: 1, filter: "brightness(1.35)", offset: .34 },
          { transform: `translate3d(0,-${Math.round(lift * .68)}px,0) scale(.6) rotate(10deg)`, opacity: .75, filter: "brightness(1.75)", offset: .72 },
          { transform: `translate3d(0,-${Math.round(lift)}px,0) scale(.08) rotate(22deg)`, opacity: 0, filter: "brightness(2.4) blur(2px)" },
        ],
        { duration: 980, easing: "cubic-bezier(.18,.62,.2,1)", fill: "forwards" },
      ).finished.catch(() => undefined);
      await director.shake("soft", 145);
      director.burst(node, "✦", 8, "cosmic-particle");
      actor.classList.remove("is-firing", "is-locking");
      this.host.classList.remove("megh-anticipating");
      actor.classList.add("is-travelling");
      await this.options.wait(210);
    }

    const exit = new DOMPoint(hostRect.width + actorWidth + 40, hoverY - 18);
    await director.characters.move(actor, current, exit, { duration: 760, easing: "cubic-bezier(.35,.05,.78,.25)" });
    actor.remove();
  }

  private async presentGoats(
    nodes: readonly HTMLElement[],
    director: FeatureDirector,
    options: MeghFeatureActorOptions,
  ): Promise<void> {
    const hostRect = this.host.getBoundingClientRect();
    const actorSize = Math.max(92, Math.min(128, hostRect.width * .16));

    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]!;
      const target = centerInHost(this.host, node);
      const actor = director.characters.create(
        `megh-goat-actor megh-board-goat goat-variant-${index % 4}`,
        `<img src="${options.goatArt}" alt="Space goat">`,
      );
      actor.style.setProperty("--megh-goat-size", `${actorSize}px`);
      const entry = new DOMPoint(-actorSize - 24, target.y - actorSize * .54);
      const approach = new DOMPoint(Math.max(6, target.x - actorSize * .78), target.y - actorSize * .54);
      director.characters.position(actor, entry.x, entry.y);
      actor.classList.add("is-running");
      await director.characters.move(actor, entry, approach, { duration: 850, easing: "cubic-bezier(.18,.72,.24,1)" });
      actor.classList.remove("is-running");
      actor.classList.add("is-looking");
      await this.options.wait(180);
      actor.classList.remove("is-looking");
      actor.classList.add("is-sniffing");
      node.classList.add("goat-marked-readable");
      this.host.classList.add("megh-anticipating");
      await this.options.wait(430);
      actor.classList.remove("is-sniffing");
      actor.classList.add("is-chomping");
      node.classList.add("goat-eaten-readable");
      options.sound("chomp");
      director.burst(node, "•", 10, "crumb-particle");
      await director.shake("soft", 130);
      await this.options.wait(620);
      this.host.classList.remove("megh-anticipating");
      actor.classList.remove("is-chomping");
      actor.classList.add("is-running");
      await director.characters.move(
        actor,
        approach,
        new DOMPoint(hostRect.width + actorSize + 40, target.y - actorSize * .54),
        { duration: 760, easing: "cubic-bezier(.34,.08,.72,.28)" },
      );
      actor.remove();
      await this.options.wait(110);
    }
  }
}
