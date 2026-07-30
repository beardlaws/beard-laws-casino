export class CryptoRandomSource {
  nextFloat() {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] / 0x100000000;
  }
  nextInt(maxExclusive) {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new RangeError('Invalid RNG range.');
    return Math.floor(this.nextFloat() * maxExclusive);
  }
}