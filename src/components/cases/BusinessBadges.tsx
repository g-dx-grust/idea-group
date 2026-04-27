import { businessTypeLabels } from '@/lib/labels';
import type { BusinessType } from '@/lib/types';

export function BusinessBadges({ types, limit }: { types: BusinessType[]; limit?: number }) {
  const visible = limit ? types.slice(0, limit) : types;
  const hidden = limit ? types.length - visible.length : 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((type) => (
        <span
          key={type}
          className="inline-flex rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs font-medium leading-tight text-[var(--color-text-grey)]"
        >
          {businessTypeLabels[type]}
        </span>
      ))}
      {hidden > 0 && (
        <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-head)] px-2 py-0.5 text-xs font-medium leading-tight text-[var(--color-text-grey)]">
          +{hidden}
        </span>
      )}
    </div>
  );
}
