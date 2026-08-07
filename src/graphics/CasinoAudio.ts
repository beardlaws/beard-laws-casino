import type { CasinoActivity } from "../state/CasinoProgression";

export type CasinoSoundCue =
  | "reel-start" | "reel-stop" | "anticipation" | "small-win" | "big-win"
  | "feature" | "coin" | "goat" | "chomp" | "ufo" | "beam"
  | "barber" | "clippers" | "builder" | "ship" | "captain" | "frozen"
  | "vault" | "vernon" | "atm" | "cashier" | "ticket" | "bank";

export type CasinoAmbience = "lobby" | "barber" | "megh" | "neema" | "beard-bank" | "tables" | "off";

const stored = (key: string, fallback: number): number => {
  const value = Number(localStorage.getItem(key) ?? fallback);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
};

export class CasinoAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private effects: GainNode | null = null;
  private ambience: GainNode | null = null;
  private ambienceOscillators: OscillatorNode[] = [];
  private ambienceTimer: number | null = null;
  private ambienceMode: CasinoAmbience = "off";
  private enabled = localStorage.getItem("beard-laws-casino-sound") !== "off";
  private volume = stored("beard-laws-casino-volume", .68);
  private effectsVolume = stored("beard-laws-casino-effects-volume", .82);
  private ambienceVolume = stored("beard-laws-casino-ambience-volume", .24);

  public constructor() {
    window.addEventListener("casino:sound", (event) => {
      const detail = (event as CustomEvent<{ cue?: CasinoSoundCue; value?: number; index?: number }>).detail;
      if (detail?.cue) this.cue(detail.cue, detail);
    });
    window.addEventListener("casino:animation", (event) => {
      const detail = (event as CustomEvent<{ cue?: string }>).detail;
      if (detail?.cue === "symbol-land") this.cue("reel-stop");
      if (detail?.cue === "big-win") this.cue("big-win");
    });
  }

  public isEnabled(): boolean { return this.enabled; }
  public getVolume(): number { return this.volume; }
  public getEffectsVolume(): number { return this.effectsVolume; }
  public getAmbienceVolume(): number { return this.ambienceVolume; }

  public setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    localStorage.setItem("beard-laws-casino-volume", String(this.volume));
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, .025);
    if (this.enabled) this.cue("coin");
  }
  public setEffectsVolume(value: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, value));
    localStorage.setItem("beard-laws-casino-effects-volume", String(this.effectsVolume));
    if (this.effects && this.context) this.effects.gain.setTargetAtTime(this.effectsVolume, this.context.currentTime, .025);
    if (this.enabled) this.cue("coin");
  }
  public setAmbienceVolume(value: number): void {
    this.ambienceVolume = Math.max(0, Math.min(1, value));
    localStorage.setItem("beard-laws-casino-ambience-volume", String(this.ambienceVolume));
    if (this.ambience && this.context) this.ambience.gain.setTargetAtTime(this.ambienceVolume, this.context.currentTime, .08);
  }

  public isHapticsEnabled(): boolean { return localStorage.getItem("beard-laws-casino-haptics") !== "off"; }
  public toggleHaptics(): boolean { const enabled=!this.isHapticsEnabled();localStorage.setItem("beard-laws-casino-haptics",enabled?"on":"off");if(enabled&&navigator.vibrate)navigator.vibrate(25);return enabled; }
  public toggle(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem("beard-laws-casino-sound", this.enabled ? "on" : "off");
    if (this.enabled) { this.notes([330,440,554],.05); if (this.ambienceMode !== "off") this.startAmbience(this.ambienceMode); }
    else this.stopAmbienceNodes();
    return this.enabled;
  }

  public activity(a: CasinoActivity): void {
    if (a.type === "spin") this.cue("reel-start");
    if (a.type === "coin") this.cue("coin", a.value === undefined ? {} : { value: a.value });
    if (a.type === "bonus") this.cue("feature");
    if (a.type === "stage" || a.type === "voyage") this.cue("ship");
    if (a.type === "win") this.cue((a.value ?? 0) >= 20 ? "big-win" : "small-win", a.value === undefined ? {} : { value: a.value });
    if (this.isHapticsEnabled() && navigator.vibrate && (a.type === "bonus" || (a.type === "win" && (a.value ?? 0) >= 20))) navigator.vibrate(a.type === "bonus" ? [40,40,80] : [25,35,25]);
  }

  public startAmbience(mode: CasinoAmbience): void {
    this.ambienceMode = mode;
    this.stopAmbienceNodes();
    if (!this.enabled || mode === "off") return;
    const c = this.ensure(); if (!c || !this.ambience) return;
    const ambienceBus = this.ambience;
    const frequencies: Record<Exclude<CasinoAmbience,"off">, readonly number[]> = {
      lobby: [55, 82.4, 110], barber: [46.2, 69.3, 92.5], megh: [65.4, 98, 146.8],
      neema: [49, 73.4, 98], "beard-bank": [41.2, 61.7, 82.4], tables: [55, 73.4, 110],
    };
    for (const [index, frequency] of frequencies[mode].entries()) {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = index === 0 ? "sine" : "triangle";
      o.frequency.value = frequency;
      g.gain.value = .008 / (index + 1);
      o.connect(g).connect(ambienceBus);
      o.start(); this.ambienceOscillators.push(o);
    }
    const pulse = (): void => {
      if (this.ambienceMode !== mode || !this.enabled) return;
      const cue = mode === "megh" ? [392, 587] : mode === "neema" ? [196, 294] : mode === "barber" ? [110, 165] : [262, 392];
      this.notes(cue, .006, "sine", .12, ambienceBus);
      this.ambienceTimer = window.setTimeout(pulse, 6500 + Math.random() * 4500);
    };
    this.ambienceTimer = window.setTimeout(pulse, 3200);
  }

  public cue(cue: CasinoSoundCue, detail: { value?: number; index?: number } = {}): void {
    if (!this.enabled) return;
    switch (cue) {
      case "reel-start": this.noise(.16, .022, 950); this.notes([95,112,132], .015, "sawtooth", .045); break;
      case "reel-stop": this.notes([110 + (detail.index ?? 0) * 12, 62], .026, "square", .018); break;
      case "anticipation": this.riser(.85); break;
      case "small-win": this.notes([330,440,554], .035, "triangle", .075); break;
      case "big-win": this.notes([262,330,392,523,659,784], .055, "triangle", .09); this.noise(.28,.018,2400); break;
      case "feature": this.notes([220,330,440,660,880], .05, "triangle", .105); break;
      case "coin": this.notes([520,680,820], .034, "triangle", .05); break;
      case "goat": this.notes([180,150,210], .032, "sawtooth", .07); break;
      case "chomp": this.noise(.12,.035,520); this.notes([120,82],.025,"square",.035); break;
      case "ufo": this.riser(.5, 260, 760); break;
      case "beam": this.notes([740,620,520],.026,"sine",.08); break;
      case "barber": this.notes([145,130,115],.035,"sawtooth",.08); break;
      case "clippers": this.buzz(.72); break;
      case "builder": this.notes([180,180,220],.034,"square",.13); break;
      case "ship": this.notes([92,92,138],.045,"sine",.28); break;
      case "captain": this.notes([392,494,587,784],.038,"triangle",.09); break;
      case "frozen": this.notes([880,1175,1568],.028,"sine",.12); this.noise(.18,.012,3200); break;
      case "vault": this.notes([72,58,46],.05,"triangle",.11); break;
      case "vernon": this.notes([294,392,494,587],.04,"triangle",.075); break;
      case "atm": this.notes([220,330,440], .026, "square", .06); break;
      case "cashier": this.notes([392,523,659,784], .04, "triangle", .07); break;
      case "ticket": this.noise(.18,.018,1800); this.notes([880,1175], .022, "square", .04); break;
      case "bank": this.notes([196,262,330], .03, "triangle", .07); break;
    }
  }

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    this.context ??= new Context();
    if (!this.master) {
      this.master = this.context.createGain(); this.effects = this.context.createGain(); this.ambience = this.context.createGain();
      this.master.gain.value = this.volume; this.effects.gain.value = this.effectsVolume; this.ambience.gain.value = this.ambienceVolume;
      this.effects.connect(this.master); this.ambience.connect(this.master); this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  private notes(frequencies:number[],gain:number,type:OscillatorType="sine",spacing=.075,destination?:AudioNode):void {
    const c=this.ensure(); if(!c||!this.effects)return; const target=destination??this.effects;
    frequencies.forEach((frequency,index)=>{const o=c.createOscillator(),v=c.createGain(),start=c.currentTime+index*spacing;o.type=type;o.frequency.value=frequency;v.gain.setValueAtTime(.0001,start);v.gain.exponentialRampToValueAtTime(gain,start+.012);v.gain.exponentialRampToValueAtTime(.0001,start+.18);o.connect(v).connect(target);o.start(start);o.stop(start+.22);});
  }
  private noise(duration=.18,gain=.02,cutoff=1200):void {
    const c=this.ensure(); if(!c||!this.effects)return; const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const source=c.createBufferSource(),filter=c.createBiquadFilter(),amp=c.createGain();filter.type="lowpass";filter.frequency.value=cutoff;amp.gain.value=gain;source.buffer=buffer;source.connect(filter).connect(amp).connect(this.effects);source.start();
  }
  private riser(duration=.7,start=180,end=980):void { const c=this.ensure();if(!c||!this.effects)return;const o=c.createOscillator(),g=c.createGain();o.type="sawtooth";o.frequency.setValueAtTime(start,c.currentTime);o.frequency.exponentialRampToValueAtTime(end,c.currentTime+duration);g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.025,c.currentTime+.08);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.connect(g).connect(this.effects);o.start();o.stop(c.currentTime+duration+.03); }
  private buzz(duration=.65):void { const c=this.ensure();if(!c||!this.effects)return;const o=c.createOscillator(),g=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();o.type="square";o.frequency.value=92;lfo.frequency.value=24;lg.gain.value=22;lfo.connect(lg).connect(o.frequency);g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.035,c.currentTime+.04);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.connect(g).connect(this.effects);o.start();lfo.start();o.stop(c.currentTime+duration);lfo.stop(c.currentTime+duration); }
  private stopAmbienceNodes(): void {
    if (this.ambienceTimer !== null) { window.clearTimeout(this.ambienceTimer); this.ambienceTimer = null; }
    this.ambienceOscillators.forEach((node) => { try { node.stop(); } catch { /* already stopped */ } });
    this.ambienceOscillators = [];
  }
}
