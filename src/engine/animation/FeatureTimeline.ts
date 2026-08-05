export type TimelineStep = () => void | Promise<void>;

export class FeatureTimeline {
  private cancelled = false;

  public cancel(): void { this.cancelled = true; }
  public reset(): void { this.cancelled = false; }

  public async wait(ms: number): Promise<void> {
    if (this.cancelled) return;
    await new Promise<void>((resolve) => window.setTimeout(resolve, ms));
  }

  public async run(...steps: TimelineStep[]): Promise<void> {
    this.reset();
    for (const step of steps) {
      if (this.cancelled) return;
      await step();
    }
  }

  public async stagger<T>(items: readonly T[], delay: number, action: (item: T, index: number) => void | Promise<void>): Promise<void> {
    for (let index = 0; index < items.length; index += 1) {
      if (this.cancelled) return;
      await action(items[index]!, index);
      if (index < items.length - 1) await this.wait(delay);
    }
  }
}
