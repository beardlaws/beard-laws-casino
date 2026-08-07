import type {
  FeatureExecutionContext,
  FeatureExecutionObserver,
  FeatureExecutionPlan,
  FeatureExecutionStep,
  FeatureExecutionStepKind,
} from "../contracts/FeatureExecution";

export type FeatureStepHandler = (context: FeatureExecutionContext) => void | Promise<void>;

export interface FeatureExecutionPipelineOptions {
  readonly observer?: FeatureExecutionObserver;
  readonly handlers?: Partial<Record<FeatureExecutionStepKind, FeatureStepHandler>>;
}

/**
 * Serial, cancellable execution queue shared by every cabinet.
 *
 * Plans never overlap. A plan queued during another plan waits its turn. This
 * is the foundation for preventing autoplay, cascades, character moments, and
 * payouts from racing each other once cabinets migrate onto the pipeline.
 */
export class FeatureExecutionPipeline {
  private readonly observer: FeatureExecutionObserver | undefined;
  private readonly handlers: Partial<Record<FeatureExecutionStepKind, FeatureStepHandler>>;
  private readonly queue: Array<{
    plan: FeatureExecutionPlan;
    resolve: () => void;
    reject: (error: unknown) => void;
  }> = [];
  private running = false;
  private activeController: AbortController | null = null;
  private activePlan: FeatureExecutionPlan | null = null;

  public constructor(options: FeatureExecutionPipelineOptions = {}) {
    this.observer = options.observer;
    this.handlers = { ...options.handlers };
  }

  public enqueue(plan: FeatureExecutionPlan): Promise<void> {
    this.assertPlan(plan);
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ plan, resolve, reject });
      void this.drain();
    });
  }

  public cancelActive(): void {
    this.activeController?.abort();
  }

  public clearPending(): number {
    const removed = this.queue.splice(0);
    for (const item of removed) item.resolve();
    return removed.length;
  }

  public get isRunning(): boolean {
    return this.running;
  }

  public get pendingCount(): number {
    return this.queue.length;
  }

  public get currentPlan(): FeatureExecutionPlan | null {
    return this.activePlan;
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift()!;
        try {
          await this.executePlan(item.plan);
          item.resolve();
        } catch (error: unknown) {
          item.reject(error);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async executePlan(plan: FeatureExecutionPlan): Promise<void> {
    const controller = new AbortController();
    this.activeController = controller;
    this.activePlan = plan;
    let activeStep: FeatureExecutionStep | null = null;

    try {
      this.observer?.onPlanStart?.(plan);
      const orderedSteps = [...plan.steps].sort((left, right) => left.order - right.order);

      for (const step of orderedSteps) {
        activeStep = step;
        if (controller.signal.aborted) {
          this.observer?.onPlanCancelled?.(plan);
          return;
        }

        if (step.delayMs > 0) await wait(step.delayMs, controller.signal);
        if (controller.signal.aborted) {
          this.observer?.onPlanCancelled?.(plan);
          return;
        }

        const context: FeatureExecutionContext = Object.freeze({
          plan,
          step,
          signal: controller.signal,
        });
        this.observer?.onStepStart?.(context);
        await this.handlers[step.kind]?.(context);
        this.observer?.onStepComplete?.(context);
      }

      this.observer?.onPlanComplete?.(plan);
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        this.observer?.onPlanCancelled?.(plan);
        return;
      }
      this.observer?.onError?.(plan, activeStep, error);
      throw error;
    } finally {
      this.activeController = null;
      this.activePlan = null;
    }
  }

  private assertPlan(plan: FeatureExecutionPlan): void {
    if (plan.id.trim().length === 0) throw new Error("Feature execution plan id is required.");
    if (plan.spinOutcomeId.trim().length === 0) throw new Error("Spin outcome id is required.");
    const orders = new Set<number>();
    for (const step of plan.steps) {
      if (!Number.isInteger(step.order) || step.order < 0) {
        throw new RangeError(`Invalid feature step order: ${step.order}.`);
      }
      if (orders.has(step.order)) throw new Error(`Duplicate feature step order: ${step.order}.`);
      if (!Number.isFinite(step.delayMs) || step.delayMs < 0) {
        throw new RangeError(`Invalid feature step delay: ${step.delayMs}.`);
      }
      orders.add(step.order);
    }
  }
}

function wait(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal.aborted || delayMs <= 0) {
      resolve();
      return;
    }
    const timer = window.setTimeout(resolve, delayMs);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}
