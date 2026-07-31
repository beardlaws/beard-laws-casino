import type { RandomSource } from './RandomSource';

export interface CryptoProvider {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}

/**
 * Browser cryptographic random source using rejection sampling.
 *
 * The crypto dependency is injected to keep tests deterministic and to avoid
 * coupling the math layer directly to window.
 */
export class CryptoRandomSource implements RandomSource {
  private static readonly UINT32_RANGE = 0x1_0000_0000;

  public constructor(
    private readonly cryptoProvider: CryptoProvider = globalThis.crypto,
  ) {
    if (!cryptoProvider) {
      throw new Error('A Web Crypto provider is required.');
    }
  }

  public nextInt(minInclusive: number, maxInclusive: number): number {
    this.assertBounds(minInclusive, maxInclusive);

    const range = maxInclusive - minInclusive + 1;

    if (range > CryptoRandomSource.UINT32_RANGE) {
      throw new RangeError('Requested random range exceeds Uint32 capacity.');
    }

    const rejectionLimit =
      Math.floor(CryptoRandomSource.UINT32_RANGE / range) * range;

    const values = new Uint32Array(1);
    let value: number;

    do {
      this.cryptoProvider.getRandomValues(values);
      value = values[0] ?? 0;
    } while (value >= rejectionLimit);

    return minInclusive + (value % range);
  }

  private assertBounds(minInclusive: number, maxInclusive: number): void {
    if (
      !Number.isSafeInteger(minInclusive)
      || !Number.isSafeInteger(maxInclusive)
    ) {
      throw new RangeError('Random bounds must be safe integers.');
    }

    if (minInclusive > maxInclusive) {
      throw new RangeError(
        'Minimum random bound cannot exceed maximum bound.',
      );
    }
  }
}
