import type { AppState } from '../state/AppStore';

export class CabinetRenderer {
  public constructor(private readonly root: HTMLElement) {}

  public render(state: AppState): void {
    const chargePercent = (state.engine.vaultCharges / 30) * 100;
    this.root.classList.toggle('is-spinning', state.spinning);

    this.setText('[data-bank]', money(state.engine.bank));
    this.setText('[data-wallet]', money(state.engine.tripWallet));
    this.setText('[data-message]', state.message);
    this.setText('[data-charges]', `${state.engine.vaultCharges} / 30 CHARGES`);
    this.setText('[data-spins]', String(state.engine.spins));
    this.setText('[data-wagered]', money(state.engine.wagered));
    this.setText('[data-returned]', money(state.engine.returned));
    this.setText('[data-rtp]', `${state.engine.sessionRtp.toFixed(2)}%`);

    const fill = this.root.querySelector<HTMLElement>('[data-charge-fill]');
    if (fill !== null) {
      fill.style.width = `${chargePercent}%`;
    }

    const spinButton = this.root.querySelector<HTMLButtonElement>('[data-spin]');
    if (spinButton !== null) {
      spinButton.disabled = state.spinning || state.engine.tripWallet < 1;
    }

    const ledger = this.root.querySelector<HTMLElement>('[data-ledger]');
    if (ledger !== null) {
      ledger.classList.toggle('open', state.ledgerOpen);
    }
  }

  private setText(selector: string, text: string): void {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (element !== null) {
      element.textContent = text;
    }
  }
}

function money(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}
