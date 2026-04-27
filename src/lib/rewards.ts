import { rewardSections, type RewardDetail, type RewardTotals, type TaxRounding } from './types';

export function calculateRewardDetailAmount(detail: Pick<RewardDetail, 'unitPrice' | 'quantity' | 'rate'>) {
  return Math.floor((detail.unitPrice * detail.quantity * detail.rate) / 100);
}

export function calculateRewardTotals({
  details,
  adjustAmount,
  miscExpense,
  stampCost,
  taxRate,
  taxRounding,
}: {
  details: RewardDetail[];
  adjustAmount: number;
  miscExpense: number;
  stampCost: number;
  taxRate: number;
  taxRounding: TaxRounding;
}): RewardTotals {
  const subtotals = Object.fromEntries(
    rewardSections.map((section) => [
      section,
      details.filter((detail) => detail.section === section).reduce((sum, detail) => sum + detail.amount, 0),
    ]),
  ) as Record<(typeof rewardSections)[number], number>;

  const totalReward = subtotals.investigation + subtotals.survey + subtotals.application + subtotals.document;
  const netReward = Math.max(0, totalReward - adjustAmount);
  const taxBase = netReward + miscExpense;
  const taxRaw = (taxBase * taxRate) / 100;
  const taxAmount = taxRounding === 'floor' ? Math.floor(taxRaw) : Math.round(taxRaw);
  const total = netReward + miscExpense + taxAmount + stampCost;

  return {
    subtotal1: subtotals.investigation,
    subtotal2: subtotals.survey,
    subtotal3: subtotals.application,
    subtotal4: subtotals.document,
    totalReward,
    adjustAmount,
    netReward,
    miscExpense,
    taxBase,
    taxAmount,
    stampCost,
    total,
  };
}

export function formatCurrency(value: number) {
  return `${value.toLocaleString('ja-JP')}円`;
}
