import { describe, expect, it } from 'vitest';
import { WalletManager } from '../../src/engine/WalletManager';

describe('WalletManager', () => {
  it('records wagers using atomic integer units', () => {
    let id = 0;

    const wallet = new WalletManager(
      {
        bankUnits: 100_000,
        casinoWalletUnits: 10_000,
      },
      {
        createTransactionId: () => `tx-${++id}`,
        now: () => new Date('2026-07-31T12:00:00.000Z'),
      },
    );

    const transaction = wallet.placeWager(100, {
      reason: 'Beard Bank spin',
      metadata: { gameId: 'beard-bank' },
    });

    expect(wallet.getSnapshot().casinoWalletUnits).toBe(9_900);
    expect(wallet.getSnapshot().lifetimeWageredUnits).toBe(100);
    expect(transaction.amountUnits).toBe(100);
  });
});
