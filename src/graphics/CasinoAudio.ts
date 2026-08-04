import type { CasinoActivity } from "../state/CasinoProgression";
export class CasinoAudio {
  private context: AudioContext | null = null;
  private enabled = localStorage.getItem("beard-laws-casino-sound") !== "off";
  public isEnabled(): boolean { return this.enabled; }
  public toggle(): boolean { this.enabled = !this.enabled; localStorage.setItem("beard-laws-casino-sound", this.enabled ? "on" : "off"); if (this.enabled) this.notes([330,440,554],.05); return this.enabled; }
  public activity(a: CasinoActivity): void {
    if (!this.enabled) return;
    if (a.type === "spin") this.notes([100,118,136],.018,"sawtooth");
    if (a.type === "coin") this.notes([520,680,820],.035,"triangle");
    if (a.type === "bonus") this.notes([220,330,440,660,880],.05,"triangle",.11);
    if (a.type === "stage" || a.type === "voyage") this.notes([392,494,587],.04);
    if (a.type === "win") this.notes((a.value ?? 0) >= 20 ? [262,330,392,523,659] : [330,440,554],.03,"triangle");
    if (navigator.vibrate && (a.type === "bonus" || (a.type === "win" && (a.value ?? 0) >= 20))) navigator.vibrate(a.type === "bonus" ? [40,40,80] : [25,35,25]);
  }
  private notes(frequencies:number[],gain:number,type:OscillatorType="sine",spacing=.075):void {
    if (!window.AudioContext) return; this.context ??= new AudioContext(); const c=this.context; if(c.state==="suspended") void c.resume();
    frequencies.forEach((frequency,index)=>{const o=c.createOscillator(),v=c.createGain(),start=c.currentTime+index*spacing;o.type=type;o.frequency.value=frequency;v.gain.setValueAtTime(.0001,start);v.gain.exponentialRampToValueAtTime(gain,start+.012);v.gain.exponentialRampToValueAtTime(.0001,start+.16);o.connect(v).connect(c.destination);o.start(start);o.stop(start+.2);});
  }
}
