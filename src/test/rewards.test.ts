import { describe, expect, it } from 'vitest';
import { calculateRewardDetailAmount, calculateRewardTotals } from '@/lib/rewards';
import type { RewardDetail } from '@/lib/types';

describe('reward calculations', () => {
  it('calculates detail amount with rate', () => {
    expect(calculateRewardDetailAmount({ unitPrice: 11100, quantity: 4, rate: 90 })).toBe(39960);
  });

  it('calculates totals with floor tax rounding', () => {
    const details: RewardDetail[] = [
      { id: '1', section: 'investigation', itemName: '公課証明', unitPrice: 1000, quantity: 7, unit: '通', rate: 100, amount: 7000 },
      { id: '2', section: 'survey', itemName: '境界標設置', unitPrice: 11100, quantity: 4, unit: '点', rate: 90, amount: 39960 },
      { id: '3', section: 'document', itemName: '土地成果図', unitPrice: 5000, quantity: 1, unit: '通', rate: 100, amount: 5000 },
    ];

    expect(calculateRewardTotals({
      details,
      adjustAmount: 960,
      miscExpense: 10000,
      stampCost: 5000,
      taxRate: 10,
      taxRounding: 'floor',
    })).toMatchObject({
      subtotal1: 7000,
      subtotal2: 39960,
      subtotal3: 0,
      subtotal4: 5000,
      totalReward: 51960,
      netReward: 51000,
      taxBase: 61000,
      taxAmount: 6100,
      total: 72100,
    });
  });
});
