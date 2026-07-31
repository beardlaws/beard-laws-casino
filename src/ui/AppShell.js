export function createAppShell(){
 const el=document.createElement('div');
 el.className='casino-shell';
 el.innerHTML=`
 <header class="casino-topbar">
   <div class="brand-lockup">
     <img src="./assets/beard-laws-crest.svg" alt="Beard Laws crest">
     <div><small>BEARD LAWS CASINO 2.1</small><strong>PROJECT GOLD BEARD</strong></div>
   </div>
   <div class="top-actions">
     <button data-sound aria-pressed="true">SOUND ON</button>
     <button data-motion aria-pressed="false">FULL MOTION</button>
     <button data-ledger-toggle>LEDGER</button>
   </div>
 </header>

 <main class="casino-floor">
   <section class="flagship-cabinet" data-cabinet>
     <div class="cabinet-side left"></div>
     <div class="cabinet-side right"></div>

     <section class="top-box">
       <div class="jackpot super">
         <span>SUPER</span><strong data-super>$10,000.02</strong><span>SUPER</span>
       </div>
       <div class="jackpot-row">
         <div class="jackpot grand"><small>GRAND</small><strong data-grand>$5,000.02</strong></div>
         <div class="jackpot major"><small>MAJOR</small><strong data-major>$500.03</strong></div>
       </div>
       <div class="mini-row">
         <div><small>MINOR BONUS</small><strong data-minor>$50.00</strong></div>
         <img class="bank-wordmark" src="./assets/beard-bank-logo.svg" alt="Beard Bank">
         <div><small>MINI BONUS</small><strong data-mini>$10.00</strong></div>
       </div>
     </section>

     <section class="feature-deck" aria-label="Living Vault feature">
       <img src="./assets/living-vault-door.svg" alt="The Living Vault door" class="vault-art">
       <div class="vault-charge-panel">
         <span>VAULT LOCK PROGRESS</span>
         <strong data-charges>0 / 30</strong>
         <div class="charge-track"><div data-charge-fill></div></div>
       </div>
       <div class="vault-bolts" aria-hidden="true">
         ${Array.from({length:30},(_,i)=>`<i style="--i:${i}"></i>`).join('')}
       </div>
     </section>

     <section class="game-screen">
       <div class="status-ribbon" data-message>ENGINE READY</div>
       <div class="reel-bezel">
         <div class="bezel-leds"></div>
         <div class="reel-host" data-reel-host></div>
         <div class="glass-reflection"></div>
       </div>
       <div class="ways-bar">
         <span>243 WAYS</span>
         <span>VAULTMASTER VERNON COLLECTS ALL VISIBLE COINS</span>
         <span>243 WAYS</span>
       </div>
     </section>

     <section class="control-console">
       <div class="console-meter"><small>CASH</small><strong data-wallet>$0.00</strong></div>
       <div class="console-meter"><small>BET</small><strong>$1.00</strong></div>
       <div class="console-meter win"><small>WIN</small><strong data-last-win>$0.00</strong></div>
       <button class="collect-button" data-ledger-toggle>INFO</button>
       <button class="spin-button" data-spin><span>SPIN</span><small>1 CREDIT</small></button>
     </section>
   </section>

   <aside class="session-rail">
     <div class="bank-card"><small>BEARD LAWS BANK</small><strong data-bank>$0.00</strong></div>
     <div class="session-card">
       <small>LIVE SESSION</small>
       <div><span>SPINS</span><strong data-spins>0</strong></div>
       <div><span>WAGERED</span><strong data-wagered>$0.00</strong></div>
       <div><span>RETURNED</span><strong data-returned>$0.00</strong></div>
       <div><span>SESSION RTP</span><strong data-rtp>0.00%</strong></div>
     </div>
     <div class="integrity-card">
       <strong>FICTIONAL ENTERTAINMENT</strong>
       <p>No deposits, purchases, prizes, withdrawals, transfers, or redemption.</p>
     </div>
   </aside>
 </main>

 <aside class="ledger" data-ledger>
   <button class="ledger-close" data-ledger-toggle aria-label="Close ledger">×</button>
   <small>VAULTMASTER VERNON'S</small>
   <h2>LEDGER</h2>
   <section>
     <h3>GAME INTEGRITY</h3>
     <p><b>RNG:</b> <code>crypto.getRandomValues()</code></p>
     <p><b>Evaluation:</b> 243 Ways, left to right</p>
     <p><b>Living Vault:</b> +1 charge per visible Beard Coin</p>
     <p><b>Audio:</b> Starts only after player interaction</p>
     <p><b>Motion:</b> Can be reduced with the cabinet control</p>
     <p class="warning">The legacy 94.20% figure is not a verified Engine 2.1 RTP.</p>
   </section>
 </aside>

 <footer>Beard Laws Casino is a free fictional entertainment simulator.</footer>`;
 return el;
}
