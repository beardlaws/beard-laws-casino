export interface RandomSource {
  nextFloat(): number;
  nextInt(maxExclusive: number): number;
}

export class CryptoRandomSource implements RandomSource {
  public nextFloat(): number {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    const value = buffer[0];
    if (value === undefined) {
      throw new Error('Crypto RNG did not return a value.');
    }
    return value / 0x1_0000_0000;
  }

  public nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError('maxExclusive must be a positive integer.');
    }
    return Math.floor(this.nextFloat() * maxExclusive);
  }
}
