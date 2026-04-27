import { formatCurrency } from '@/lib/rewards';
import type { RewardTotals } from '@/lib/types';

export function RewardSummary({ totals }: { totals: RewardTotals }) {
  const rows = [
    ['調査業務 小計', totals.subtotal1],
    ['測量業務 小計', totals.subtotal2],
    ['申請手続 小計', totals.subtotal3],
    ['書類作成 小計', totals.subtotal4],
    ['合計報酬額', totals.totalReward],
    ['調整額', totals.adjustAmount],
    ['差引報酬額', totals.netReward],
    ['諸経費', totals.miscExpense],
    ['消費税', totals.taxAmount],
    ['立替金', totals.stampCost],
  ] as const;

  return (
    <div className="panel p-[var(--space-m)]">
      <div className="grid gap-[var(--space-xs)]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-[var(--space-m)] text-[length:var(--font-s)]">
            <span className="muted">{label}</span>
            <span className="mono">{formatCurrency(value)}</span>
          </div>
        ))}
        <div className="mt-[var(--space-s)] flex items-center justify-between border-t border-[var(--color-border)] pt-[var(--space-s)] font-semibold">
          <span>総合計</span>
          <span className="mono text-[length:var(--font-l)]">{formatCurrency(totals.total)}</span>
        </div>
      </div>
    </div>
  );
}
