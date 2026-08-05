export type CabinetId = "beard-bank" | "big-bad-barber" | "megh-cosmic-jam" | "neema-high-seas" | "papa-blackjack" | "roulette";

export interface CabinetManifestEntry {
  id: CabinetId;
  name: string;
  identity: string;
  status: "flagship" | "playable" | "development";
  engine: "dom-reels" | "pixi" | "table" | "wheel";
  coreLoop: string;
}

export const CABINET_MANIFEST: readonly CabinetManifestEntry[] = [
  { id: "beard-bank", name: "Beard Bank", identity: "The Rolex", status: "flagship", engine: "pixi", coreLoop: "Charge the Living Vault, collect coins with Vernon, crack the vault." },
  { id: "big-bad-barber", name: "The Big Bad Barber", identity: "The Blockbuster", status: "flagship", engine: "dom-reels", coreLoop: "Build beard fortresses, upgrade them, survive the Barber, reveal prizes." },
  { id: "megh-cosmic-jam", name: "Megh's Cosmic Jam", identity: "The Party", status: "flagship", engine: "dom-reels", coreLoop: "Cascade symbols, unlock channels, trigger goats and UFO chaos." },
  { id: "neema-high-seas", name: "Neema's High Seas", identity: "The Vacation", status: "flagship", engine: "dom-reels", coreLoop: "Collect tickets, advance the voyage, upgrade the cabin, reach Happy Hour." },
  { id: "papa-blackjack", name: "Papa Blackjack", identity: "The Lounge", status: "playable", engine: "table", coreLoop: "Play authentic blackjack with Papa's personality." },
  { id: "roulette", name: "Royal Roulette", identity: "The Classy Room", status: "playable", engine: "wheel", coreLoop: "Place bets, spin the wheel, watch the ball land accurately." },
] as const;

export const PROJECT_VERSION = "77A" as const;
export const PROJECT_NAME = "Project Beard" as const;
