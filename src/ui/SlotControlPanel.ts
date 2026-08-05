export interface SlotControlPanelOptions {
  prefix: string;
  actionLabel?: string;
  auto?: boolean;
}

/** Shared semantic markup. Games can migrate without changing their data hooks. */
export function slotControlPanelMarkup(options: SlotControlPanelOptions): string {
  const { prefix, actionLabel = "SPIN", auto = true } = options;
  return `<div class="slot-control-panel" data-slot-controls="${prefix}">
    <div class="slot-meter"><small>CREDIT</small><b data-${prefix}-credit>$0.00</b></div>
    <div class="slot-denom" aria-label="Denomination selector"><button data-${prefix}-denom-down aria-label="Lower denomination">−</button><span><small>DENOM</small><b data-${prefix}-denom>1¢</b></span><button data-${prefix}-denom-up aria-label="Raise denomination">+</button></div>
    <div class="slot-bet-control"><button data-${prefix}-bet-down aria-label="Decrease bet">−</button><span><small>BET • <i data-${prefix}-credits></i> CR</small><b data-${prefix}-bet>$1.00</b></span><button data-${prefix}-bet-up aria-label="Increase bet">+</button></div>
    <div class="slot-meter slot-win-meter"><small>WIN</small><b data-${prefix}-win>$0.00</b></div>
    <button class="slot-control-max" data-${prefix}-max>MAX BET</button>
    ${auto ? `<button class="slot-control-auto" data-${prefix}-auto>AUTO</button>` : ""}
    <button class="slot-control-spin" data-${prefix}-spin>${actionLabel}</button>
  </div>`;
}
