import { CryptoRandomSource } from "../../engine/CryptoRandomSource";
import { ReelGenerator } from "../../engine/ReelGenerator";
import { WaysEvaluator } from "../../engine/WaysEvaluator";
import { beardBankConfig } from "./BeardBankConfig";
import type { BeardBankProgress } from "../../state/PlayerProfileStore";
import type { CasinoActivity } from "../../state/CasinoProgression";
import { casinoRandom } from "../../engine/CasinoRandom";

const BET_LEVELS = [25, 50, 75, 100, 150, 200, 300, 500, 1000] as const;
const LABELS: Record<string, string> = {
  comb: "COMB", razor: "RAZOR", balm: "BALM", oil: "OIL", crown: "CROWN",
  "vault-crest": "VAULT CREST", "luxury-kit": "LUXURY KIT", vernon: "VERNON",
  "beard-coin": "GOLD COIN", "gold-crest": "WILD", "vault-door": "VAULT DOOR",
  "jackpot-key": "KEY",
};
const ART: Record<string, string> = {
  comb: new URL("../../../assets/comb.svg", import.meta.url).href,
  oil: new URL("../../../assets/oil.svg", import.meta.url).href,
  crown: new URL("../../../assets/crown.svg", import.meta.url).href,
  "jackpot-key": new URL("../../../assets/key.svg", import.meta.url).href,
  "beard-coin": new URL("../../../assets/concept-symbols/beard-coin.png", import.meta.url).href,
  "gold-crest": new URL("../../../assets/concept-symbols/gold-crest.png", import.meta.url).href,
  "vault-door": new URL("../../../assets/concept-symbols/vault-door.png", import.meta.url).href,
  vernon: new URL("../../../assets/concept-symbols/vernon.png", import.meta.url).href,
  balm: new URL("../../../assets/generated/balm.png", import.meta.url).href,
  razor: new URL("../../../assets/generated/razor.png", import.meta.url).href,
  "vault-crest": new URL("../../../assets/generated/vault-crest.png", import.meta.url).href,
  "luxury-kit": new URL("../../../assets/generated/luxury-kit.png", import.meta.url).href,
};
const asset = (id: string): string => ART[id] ?? ART.comb!;
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export class BeardBankDOM {
  private readonly reels = new ReelGenerator(new CryptoRandomSource());
  private readonly evaluator = new WaysEvaluator();
  private spinning = false;
  private betIndex = 3;
  private auto: number | "infinite" | null = null;
  private charges: number;
  private coins: number;
  private win = 0;

  public constructor(
    private readonly root: HTMLElement,
    progress: BeardBankProgress,
    private readonly getWallet: () => number,
    private readonly setWallet: (units: number) => void,
    private readonly saveProgress: (charges: number, coins: number) => void,
    private readonly onExit: () => void,
    private readonly onActivity: (activity: CasinoActivity) => void,
  ) { this.charges = progress.livingVaultCharges; this.coins = progress.lifetimeCoinsCollected; }

  public open(): void {
    this.root.innerHTML = `<main class="bb60">
      <nav><button data-home>← FLOOR</button><span>BEARD LAWS CASINO</span><button data-rules>PAYTABLE</button></nav>
      <section class="bb60-machine">
        <header><div><small>243 WAYS • VERIFIED 96.42% SIMULATED RTP</small><h1>BEARD BANK</h1><p>BUILD THE VAULT. WAKE VERNON. BREAK THE BANK.</p></div><div class="bb60-jackpots"><span><small>MINOR</small><b>$25</b></span><span><small>MAJOR</small><b>$100</b></span><span><small>GRAND</small><b>$500</b></span></div></header>
        <div class="bb60-vault"><div class="bb60-door" data-door><i></i><b>${this.charges >= 30 ? "CRACK IT" : `${this.charges}/30`}</b></div><div><small>THE LIVING VAULT</small><strong data-pressure>${this.charges} OF 30 COINS</strong><i class="bb60-meter"><em data-fill style="width:${this.charges / 30 * 100}%"></em></i><p>3 coins launch Vault Heist • stacked doors wake Vernon</p></div></div>
        <div class="bb60-status" data-status>VAULT SECURED • READY</div>
        <div class="bb60-reels" data-reels></div>
        <div class="bb60-chase"><span>🪙 COIN HEIST</span><span>🚪 VERNON FREE SPINS</span><span>🔑 LIVING VAULT</span></div>
        <footer><div><small>CREDIT</small><b data-credit></b></div><div class="bb60-bet"><button data-minus>−</button><span><small>BET</small><b data-bet></b></span><button data-plus>+</button></div><div><small>WIN</small><b data-win>$0.00</b></div><button data-auto>AUTO</button><button class="bb60-spin" data-spin>SPIN</button></footer>
      </section></main>`;
    this.root.querySelector("[data-home]")?.addEventListener("click", () => { if (!this.spinning) this.onExit(); });
    this.root.querySelector("[data-rules]")?.addEventListener("click", () => this.rules());
    this.root.querySelector("[data-spin]")?.addEventListener("click", () => void this.spin());
    this.root.querySelector("[data-minus]")?.addEventListener("click", () => this.bet(-1));
    this.root.querySelector("[data-plus]")?.addEventListener("click", () => this.bet(1));
    this.root.querySelector("[data-auto]")?.addEventListener("click", () => this.toggleAuto());
    this.render(this.reels.generate(beardBankConfig).matrix); this.update();
  }

  private render(matrix: readonly (readonly string[])[], winners = new Set<string>()): void {
    const host = this.root.querySelector<HTMLElement>("[data-reels]")!;
    host.innerHTML = matrix.flatMap((reel, x) => reel.map((id, y) => `<div class="bb60-symbol s-${id}${winners.has(`${x}:${y}`) ? " winner" : ""}" style="grid-column:${x + 1};grid-row:${y + 1};--reel:${x}"><img src="${asset(id)}" alt="${LABELS[id]}"><small>${LABELS[id]}</small></div>`)).join("");
  }

  private async spin(): Promise<boolean> {
    if (this.spinning) return false;
    const bet = BET_LEVELS[this.betIndex]!;
    if (this.getWallet() < bet) { this.say("VISIT THE ATM"); this.auto = null; return false; }
    this.spinning = true; this.win = 0; this.setWallet(this.getWallet() - bet); this.onActivity({ type: "spin", game: "beard-bank", wager: bet }); this.update();
    const result = this.reels.generate(beardBankConfig);
    const evaluation = this.evaluator.evaluate(result.matrix, beardBankConfig, bet);
    const reelHost = this.root.querySelector<HTMLElement>("[data-reels]")!;
    reelHost.classList.add("spinning"); this.say("VAULT WHEELS IN MOTION");
    for (let i = 0; i < 6; i += 1) { this.render(this.reels.generate(beardBankConfig).matrix); await wait(90 + i * 25); }
    this.render(result.matrix); reelHost.classList.remove("spinning"); reelHost.classList.add("landing"); await wait(420); reelHost.classList.remove("landing");
    const flat = result.matrix.flat(); const newCoins = flat.filter((s) => s === "beard-coin").length;
    const stackedDoors = result.matrix.some((reel) => reel.every((s) => s === "vault-door"));
    if (evaluation.awardUnits > 0) { this.win += evaluation.awardUnits; this.setWallet(this.getWallet() + evaluation.awardUnits); const cells = new Set(evaluation.wayWins.flatMap((w) => w.winningPositions.map((p) => `${p.reelIndex}:${p.rowIndex}`))); this.render(result.matrix, cells); this.say(`${evaluation.wayWins.length} WAYS PAY`); this.onActivity({ type: "win", game: "beard-bank", amount: evaluation.awardUnits, value: evaluation.awardUnits / bet, wager: bet }); await wait(900); }
    if (newCoins) { await this.collectCoins(newCoins); }
    let feature = false;
    if (newCoins >= 3) { feature = true; await this.vaultHeist(bet, newCoins); }
    if (stackedDoors) { feature = true; await this.vernonSpins(bet, 8); }
    if (this.charges >= 30) { feature = true; await this.livingVault(bet); }
    this.saveProgress(this.charges, this.coins); this.spinning = false; this.say(this.win ? "WIN PAID • READY" : "VAULT SECURED • READY"); this.update();
    return feature;
  }

  private async collectCoins(count: number): Promise<void> { this.coins += count; this.charges = Math.min(30, this.charges + count); this.onActivity({ type: "coin", game: "beard-bank", value: count }); this.root.querySelector("[data-door]")?.classList.add("charging"); this.say(`COLLECTING ${count} VAULT COIN${count === 1 ? "" : "S"}`); for (let i=0;i<count;i+=1){ await wait(300); this.update(); } this.root.querySelector("[data-door]")?.classList.remove("charging"); }
  private async vaultHeist(bet: number, coins: number): Promise<void> { this.onActivity({ type: "bonus", game: "beard-bank" }); this.root.querySelector(".bb60-machine")?.classList.add("feature-mode"); this.say("VAULT HEIST • LOCKS ENGAGED"); await wait(1200); const award = Math.round(bet * (3 + coins * 1.5 + casinoRandom() * 8)); await this.countAward(award, "HEIST COMPLETE"); this.root.querySelector(".bb60-machine")?.classList.remove("feature-mode"); }
  private async vernonSpins(bet: number, spins: number): Promise<void> { this.onActivity({ type: "bonus", game: "beard-bank" }); this.say(`VERNON FREE SPINS • ${spins} AWARDED`); await wait(1000); let total=0; for(let n=1;n<=spins;n+=1){ const r=this.reels.generate(beardBankConfig); const e=this.evaluator.evaluate(r.matrix,beardBankConfig,bet); this.say(`FREE SPIN ${n} OF ${spins} • ${2}×`); this.render(r.matrix); total += e.awardUnits*2; await wait(700); } await this.countAward(total,"VERNON FEATURE COMPLETE"); }
  private async livingVault(bet: number): Promise<void> { this.onActivity({ type: "bonus", game: "beard-bank" }); this.root.querySelector("[data-door]")?.classList.add("open"); this.say("THE LIVING VAULT IS OPEN"); await wait(1400); const award=Math.round(bet*(12+casinoRandom()*38)); await this.countAward(award,"LIVING VAULT COLLECTED"); this.charges=0; this.root.querySelector("[data-door]")?.classList.remove("open"); }
  private async countAward(award:number,label:string):Promise<void>{ const start=this.win; for(let i=1;i<=18;i+=1){this.win=start+Math.round(award*i/18);this.update();await wait(35);} this.setWallet(this.getWallet()+award); this.onActivity({type:"win",game:"beard-bank",amount:award,value:award/BET_LEVELS[this.betIndex]!,wager:BET_LEVELS[this.betIndex]!}); this.say(label); await wait(900); }
  private toggleAuto():void { if(this.auto!==null){this.auto=null;this.say("AUTO STOPS AFTER THIS SPIN");return;} if(this.spinning)return;this.auto=25;void this.autoLoop(); }
  private async autoLoop():Promise<void>{ while(this.auto!==null && (this.auto==="infinite"||this.auto>0)){const feature=await this.spin();if(feature){this.auto=null;break;}if(typeof this.auto==="number")this.auto-=1;await wait(450);}this.update(); }
  private bet(direction:number):void{if(this.spinning||this.auto!==null)return;this.betIndex=Math.max(0,Math.min(BET_LEVELS.length-1,this.betIndex+direction));this.update();}
  private say(text:string):void{const node=this.root.querySelector<HTMLElement>("[data-status]");if(node)node.textContent=text;}
  private update():void{const money=(n:number)=>`$${(n/100).toFixed(2)}`; const set=(q:string,v:string)=>{const n=this.root.querySelector<HTMLElement>(q);if(n)n.textContent=v;}; set("[data-credit]",money(this.getWallet()));set("[data-bet]",money(BET_LEVELS[this.betIndex]!));set("[data-win]",money(this.win));set("[data-pressure]",this.charges>=30?"VAULT READY":`${this.charges} OF 30 COINS`);set("[data-door] b",this.charges>=30?"CRACK IT":`${this.charges}/30`);const fill=this.root.querySelector<HTMLElement>("[data-fill]");if(fill)fill.style.width=`${this.charges/30*100}%`;const spin=this.root.querySelector<HTMLButtonElement>("[data-spin]");if(spin)spin.disabled=this.spinning;set("[data-auto]",this.auto===null?"AUTO":"STOP");}
  private rules():void{const m=document.createElement("div");m.className="modal-backdrop";m.innerHTML=`<section class="progress-modal"><button class="close" data-close>×</button><small>BEARD BANK • 243 WAYS</small><h2>Break the Bank</h2><p>Matching symbols pay left to right on adjacent reels. Wild crests substitute. Three visible coins launch Vault Heist. A stacked reel of doors launches automatic Vernon Free Spins. Every collected coin charges the Living Vault; 30 opens the automatic hold-and-win finale.</p><button class="primary" data-close>BACK TO GAME</button></section>`;document.body.appendChild(m);m.querySelectorAll("[data-close]").forEach(n=>n.addEventListener("click",()=>m.remove()));}
}
