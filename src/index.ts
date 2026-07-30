import './styles/main.css';
import { BeardEngine } from './engine/BeardEngine';
import { CryptoRandomSource } from './engine/RNG';
import { ReelStripView } from './graphics/ReelStripView';
import { CabinetRenderer } from './graphics/CabinetRenderer';
import { beardBankConfig } from './games/BeardBank/BeardBankConfig';
import { AppStore } from './state/AppStore';
import { createAppShell } from './ui/AppShell';

async function bootstrap(): Promise<void> {
  const mount = document.querySelector<HTMLElement>('#app');
  if (mount === null) {
    throw new Error('Application mount point #app was not found.');
  }

  const shell = createAppShell();
  mount.replaceChildren(shell);

  const engine = new BeardEngine(beardBankConfig, new CryptoRandomSource());
  const store = new AppStore({
    engine: engine.snapshot,
    spinning: false,
    ledgerOpen: false,
    message: 'ENGINE READY',
  });

  const cabinetRenderer = new CabinetRenderer(shell);
  store.subscribe((state) => cabinetRenderer.render(state));

  const reelHost = shell.querySelector<HTMLElement>('[data-reel-host]');
  if (reelHost === null) {
    throw new Error('Reel host was not found.');
  }

  const reels = new ReelStripView();
  await reels.mount(reelHost);

  const firstResult = engine.spin({ bet: 1, winMode: 'ways' });
  store.syncEngine(engine.snapshot, firstResult);
  reels.renderGrid(firstResult.grid);

  const spinButton = shell.querySelector<HTMLButtonElement>('[data-spin]');
  if (spinButton === null) {
    throw new Error('Spin button was not found.');
  }

  spinButton.addEventListener('click', async () => {
    if (store.snapshot.spinning) {
      return;
    }

    try {
      store.setSpinning(true);
      const result = engine.spin({ bet: 1, winMode: 'ways' });
      await reels.spinTo(result.grid);
      store.syncEngine(engine.snapshot, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown spin error.';
      console.error(error);
      window.alert(message);
    } finally {
      store.setSpinning(false);
    }
  });

  shell.querySelectorAll<HTMLButtonElement>('[data-ledger-toggle]').forEach((button) => {
    button.addEventListener('click', () => store.toggleLedger());
  });
}

void bootstrap().catch((error: unknown) => {
  console.error('Beard Laws Casino failed to start.', error);
  const mount = document.querySelector<HTMLElement>('#app');
  if (mount !== null) {
    mount.innerHTML = `
      <div class="fatal-error">
        <h1>Engine initialization failed</h1>
        <p>${error instanceof Error ? escapeHtml(error.message) : 'Unknown error'}</p>
        <p>Open the browser console for the full stack trace.</p>
      </div>
    `;
  }
});

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
