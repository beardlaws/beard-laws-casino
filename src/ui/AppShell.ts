export function createAppShell(): HTMLElement {
  const shell = document.createElement('div');
  shell.className = 'casino-shell';
  shell.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="brand-seal">BL</span>
        <div>
          <small>BEARD LAWS CASINO 2.0</small>
          <strong>PROJECT GOLD BEARD</strong>
        </div>
      </div>
      <div class="balances">
        <div><small>BEARD LAWS BANK</small><strong data-bank>$0.00</strong></div>
        <div><small>CASINO WALLET</small><strong data-wallet>$0.00</strong></div>
      </div>
    </header>

    <main class="floor">
      <aside class="left-rail">
        <button class="nav active">BEARD BANK</button>
        <button class="nav" disabled>LUMBER BEARD <small>COMING LATER</small></button>
        <button class="nav" data-ledger-toggle>VAULTMASTER'S LEDGER</button>
        <div class="integrity-card">
          <strong>HONEST BY DESIGN</strong>
          <p>Independent outcomes. Transparent feature order. Fictional credits only.</p>
        </div>
      </aside>

      <section class="cabinet">
        <div class="marquee">
          <small>VAULTMASTER VERNON PRESENTS</small>
          <h1>BEARD BANK</h1>
          <p>BEARD ENGINE 2.0 • PHASE 1</p>
        </div>

        <div class="living-vault">
          <div class="vault-icon">✦</div>
          <div>
            <span>THE LIVING VAULT</span>
            <strong data-charges>0 / 30 CHARGES</strong>
            <div class="charge-track"><div data-charge-fill></div></div>
          </div>
        </div>

        <div class="message" data-message>ENGINE READY</div>
        <div class="reel-host" data-reel-host></div>

        <div class="control-deck">
          <div class="meter"><small>LAST WIN</small><strong>$0.00</strong></div>
          <div class="meter"><small>BET</small><strong>$1.00</strong></div>
          <button class="spin-button" data-spin>SPIN</button>
        </div>
      </section>

      <aside class="right-rail">
        <div class="stats-card">
          <small>LIVE SESSION</small>
          <div><span>SPINS</span><strong data-spins>0</strong></div>
          <div><span>WAGERED</span><strong data-wagered>$0.00</strong></div>
          <div><span>RETURNED</span><strong data-returned>$0.00</strong></div>
          <div><span>SESSION RTP</span><strong data-rtp>0.00%</strong></div>
        </div>
      </aside>
    </main>

    <aside class="ledger" data-ledger>
      <button class="ledger-close" data-ledger-toggle>×</button>
      <small>VAULTMASTER VERNON'S</small>
      <h2>LEDGER</h2>
      <section>
        <h3>GAME INTEGRITY</h3>
        <p>RNG Source: <code>crypto.getRandomValues()</code></p>
        <p>Win Mode: 243 Ways</p>
        <p>Feature Order:</p>
        <ol>
          <li>243-Ways evaluation</li>
          <li>Scatter evaluation</li>
          <li>Vernon's Favor</li>
          <li>Living Vault charges</li>
          <li>Ledger and state synchronization</li>
        </ol>
        <p class="warning">94.20% is a legacy design target and is not yet verified for Engine 2.0.</p>
      </section>
    </aside>

    <footer>
      Free fictional entertainment simulator. No purchase, deposit, prize, withdrawal, transfer, or redemption.
    </footer>
  `;
  return shell;
}
