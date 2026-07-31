export const SYMBOL_ASSETS = {
  oil: {
    webp: './assets/symbols/oil.webp',
    png: './assets/symbols/oil.png',
    fallback: './assets/oil.svg',
  },
  comb: {
    webp: './assets/symbols/comb.webp',
    png: './assets/symbols/comb.png',
    fallback: './assets/comb.svg',
  },
  razor: {
    webp: './assets/symbols/razor.webp',
    png: './assets/symbols/razor.png',
    fallback: './assets/razor.svg',
  },
  balm: {
    webp: './assets/symbols/balm.webp',
    png: './assets/symbols/balm.png',
    fallback: './assets/balm.svg',
  },
  key: {
    webp: './assets/symbols/key.webp',
    png: './assets/symbols/key.png',
    fallback: './assets/key.svg',
  },
  crown: {
    webp: './assets/symbols/crown.webp',
    png: './assets/symbols/crown.png',
    fallback: './assets/crown.svg',
  },
  coin: {
    webp: './assets/symbols/coin.webp',
    png: './assets/symbols/coin.png',
    fallback: './assets/coin.svg',
  },
  vault: {
    webp: './assets/symbols/vault.webp',
    png: './assets/symbols/vault.png',
    fallback: './assets/vault.svg',
  },
  vernon: {
    webp: './assets/symbols/vernon.webp',
    png: './assets/symbols/vernon.png',
    fallback: './assets/vernon.svg',
  },
};

export const BUTTON_ASSETS = {
  paytable: {
    webp: './assets/buttons/paytable.webp',
    fallback: null,
  },
  info: {
    webp: './assets/buttons/info.webp',
    fallback: null,
  },
  maxBet: {
    webp: './assets/buttons/max-bet.webp',
    fallback: null,
  },
  spin: {
    webp: './assets/buttons/spin.webp',
    fallback: null,
  },
};

export async function resolveAssetPath(asset) {
  const candidates = [asset.webp, asset.png, asset.fallback].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { method: 'HEAD', cache: 'no-store' });
      if (response.ok) return candidate;
    } catch {
      // Continue to the next candidate.
    }
  }
  if (asset.fallback) return asset.fallback;
  throw new Error('No usable art asset was found.');
}
