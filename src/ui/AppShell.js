export function createAppShell(){
 const el=document.createElement('div');
 el.className='casino-shell';
 el.innerHTML=`
 <header class="casino-topbar">
   <button class="brand-lockup" data-lobby aria-label="Return to casino lobby">
     <img src="./assets/beard-laws-crest.svg" alt="">
     <div><small>BEARD LAWS CASINO 3.2</small><strong>PROJECT GOLD BEARD</strong></div>
   </button>
   <div class="top-actions">
     <button data-lobby>CASINO FLOOR</button>
     <button data-sound aria-pressed="true">SOUND ON</button>
     <button data-motion aria-pressed="false">FULL MOTION</button>
     <button data-ledger-toggle>LEDGER</button>
   </div>
 </header>

 <section class="lobby-view active" data-view="lobby">
   <div class="lobby-hero">
     <img src="./assets/beard-laws-crest.svg" alt="">
     <small>WELCOME TO</small>
     <h1>BEARD LAWS CASINO</h1>
     <p>Choose a machine. Your fictional casino wallet remains with you across the floor.</p>
   </div>
   <div class="machine-grid">
     ${gameCard('beard-bank','BEARD BANK','THE LIVING VAULT','Flagship machine','playable')}
     ${gameCard('lumber-beard','LUMBER BEARD','FOREST EXPANSION','Expanding reels','preview')}
     ${gameCard('beard-drop','BEARD DROP','FREE-FALL FORTUNE','Original drop game','preview')}
     ${gameCard('roulette','AMERICAN ROULETTE','CLASSIC TABLE','Double-zero wheel','preview')}
     ${gameCard('blackjack','BLACKJACK','THE BARBER TABLE','Dealer challenge','preview')}
   </div>
   <div class="lobby-wallet">
     <span>BEARD LAWS BANK <strong data-bank>$0.00</strong></span>
     <span>CASINO WALLET <strong data-wallet>$0.00</strong></span>
   </div>
 </section>

 <section class="machine-view" data-view="machine">
   <div class="machine-fit-stage" data-fit-stage>
     <div class="machine-fit-inner" data-fit-inner>
       <section class="flagship-cabinet" data-cabinet>
         <section class="jackpot-marquee">
           <div class="jackpot super"><span>SUPER</span><strong data-super>$10,000.02</strong><span>SUPER</span></div>
           <div class="jackpot-row">
             <div class="jackpot grand"><small>GRAND</small><strong data-grand>$5,000.02</strong></div>
             <div class="jackpot major"><small>MAJOR</small><strong data-major>$500.03</strong></div>
           </div>
           <div class="minor-row">
             <div><small>MINOR BONUS</small><strong data-minor>$50.00</strong></div>
             <img src="./assets/beard-bank-logo.svg" alt="Beard Bank">
             <div><small>MINI BONUS</small><strong data-mini>$10.00</strong></div>
           </div>
         </section>

         <section class="feature-deck">
           <div class="vernon-panel">
             <img src="./assets/vernon-portrait-frame.svg" alt="Vaultmaster Vernon">
           </div>
           <div class="wheel-panel">
             <img src="./assets/vault-fortune-wheel.svg" alt="Living Vault feature wheel">
             <div class="wheel-pointer"></div>
           </div>
           <div class="lock-panel">
             <small>LIVING VAULT</small>
             <strong>AWAKEN WHAT'S INSIDE</strong>
             <span>MYSTERY FEATURE</span>
           </div>
         </section>

         <section class="reel-and-preview-layout">
           <div class="reel-assembly">
             <div class="status-ribbon" data-message>ENGINE READY</div>
             <div class="reel-shell">
               <div class="marker-column marker-left">
                 ${[1,2,3,4,5,6,7,8,9].map(n=>`<b data-marker="${n}">${n}</b>`).join('')}
               </div>
               <div class="reel-bezel">
                 <div class="reel-host" data-reel-host></div>
                 <div class="reel-chrome-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
                 <svg class="win-line-overlay" data-win-lines viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"></svg>
                 <div class="glass-reflection"></div>
                 <div class="bezel-leds"></div>
               </div>
               <div class="marker-column marker-right">
                 ${[1,2,3,4,5,6,7,8,9].map(n=>`<b data-marker="${n}">${n}</b>`).join('')}
               </div>
             </div>
             <div class="ways-bar">
               <span>243 WAYS</span>
               <strong data-sequence-label>WIN PRESENTATION READY</strong>
               <span>243 WAYS</span>
             </div>
           </div>

           <aside class="win-drawer" data-win-drawer>
             <div class="drawer-header">
               <small>WIN REVIEW</small>
               <strong data-win-count>NO ACTIVE WIN</strong>
             </div>
             <div class="win-card-stack" data-win-cards>
               <div class="drawer-empty">
                 <span>Winning groups appear here without covering the reels.</span>
               </div>
             </div>
             <div class="drawer-total">
               <small>TOTAL WIN</small>
               <strong data-drawer-total>$0.00</strong>
             </div>
           </aside>
         </section>

         <section class="control-console">
           <button class="deck-button floor-button" data-lobby>FLOOR</button>
           <button class="deck-button paytable-button">PAY TABLE</button>
           <button class="deck-button info-button" data-ledger-toggle>INFO</button>
           <div class="console-meter"><small>CASH</small><strong data-wallet>$0.00</strong></div>
           <div class="bet-control">
             <button disabled>−</button><div><small>BET</small><strong>$1.00</strong></div><button disabled>+</button>
           </div>
           <div class="console-meter win"><small>WIN</small><strong data-last-win>$0.00</strong></div>
           <button class="deck-button max-bet-button" disabled>MAX BET</button>
           <button class="spin-button" data-spin><span>SPIN</span><small>HOLD FOR AUTO</small></button>
         </section>
       </section>
     </div>
   </div>
 </section>

 <section class="preview-view" data-view="preview">
   <div class="preview-machine">
     <button data-lobby class="back-floor">← CASINO FLOOR</button>
     <div class="preview-art" data-preview-art></div>
     <small>BEARD LAWS CASINO</small>
     <h2 data-preview-title>COMING SOON</h2>
     <p data-preview-copy>This machine is being rebuilt on Beard Engine 2.0.</p>
     <button data-play-beard-bank>PLAY BEARD BANK</button>
   </div>
 </section>

 <aside class="ledger" data-ledger>
   <button class="ledger-close" data-ledger-toggle>×</button>
   <small>VAULTMASTER VERNON'S</small><h2>LEDGER</h2>
   <section>
     <h3>GAME INTEGRITY</h3>
     <p><b>RNG:</b> <code>crypto.getRandomValues()</code></p>
     <p><b>Evaluation:</b> 243 Ways, adjacent reels left to right</p>
     <p><b>Living Vault:</b> +1 charge for each visible Beard Coin</p>
     <p><b>Win paths:</b> Presentation only; engine awards remain unchanged</p>
     <p class="warning">The legacy 94.20% target is not a verified Engine 3.2 RTP.</p>
   </section>
 </aside>

 <footer>Free fictional entertainment only. No purchases, deposits, prizes, withdrawals, transfers, or redemption.</footer>`;
 return el;
}

function gameCard(id,title,feature,copy,status){
 return `<button class="machine-card ${status}" data-game="${id}">
   <div class="card-lights"></div>
   <span class="machine-status">${status==='playable'?'PLAY NOW':'IN DEVELOPMENT'}</span>
   <div class="card-marquee">${title}</div>
   <div class="card-feature">${feature}</div>
   <p>${copy}</p>
 </button>`;
}
