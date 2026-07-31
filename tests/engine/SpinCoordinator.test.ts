import { describe, expect, it } from 'vitest';
import { FeaturePipeline } from '../../src/engine/FeaturePipeline';
import { ReelGenerator } from '../../src/engine/ReelGenerator';
import { SpinCoordinator } from '../../src/engine/SpinCoordinator';
import { WalletManager } from '../../src/engine/WalletManager';
import { WaysEvaluator } from '../../src/engine/WaysEvaluator';
import {
  beardBankConfig,
  beardBankSpinMetadataFactory,
  initialBeardBankGameState,
  type BeardBankGameState,
  type BeardBankSpinMetadata,
} from '../../src/games/BeardBank/BeardBankConfig';
import { TestRandomSource } from './TestRandomSource';

describe('SpinCoordinator', () => {
  it('orchestrates outcome, wager ledger, feature pipeline, and award', () => {
    let transactionId = 0;

    const wallet = new WalletManager(
      {
        bankUnits: 0,
        casinoWalletUnits: 10_000,
      },
      {
        createTransactionId: () => `tx-${++transactionId}`,
        now: () => new Date('2026-07-31T12:00:00.000Z'),
      },
    );

    const coordinator = new SpinCoordinator<
      BeardBankGameState,
      BeardBankSpinMetadata
    >(
      wallet,
      new ReelGenerator(new TestRandomSource([0, 1, 2, 3, 4])),
      new WaysEvaluator(),
      new FeaturePipeline([]),
      beardBankSpinMetadataFactory,
      beardBankConfig,
      { createSpinId: () => 'spin-1' },
    );

    const result = coordinator.executeSpin(
      100,
      initialBeardBankGameState,
    );

    expect(result.spinId).toBe('spin-1');
    expect(result.wagerTransaction.kind).toBe('wager');
    expect(result.walletAfter.transactionSequence).toBeGreaterThanOrEqual(1);
    expect(result.totalAwardUnits).toBeGreaterThanOrEqual(0);
  });
});
