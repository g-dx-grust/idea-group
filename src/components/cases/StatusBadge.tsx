import { statusLabels } from '@/lib/labels';
import type { CaseStatus } from '@/lib/types';

const statusClass: Record<CaseStatus, string> = {
  draft: 'border-gray-200 bg-gray-100 text-gray-700',
  in_progress: 'border-gray-200 bg-gray-100 text-gray-700',
  done: 'border-green-200 bg-green-100 text-green-800',
  invoiced: 'border-yellow-200 bg-yellow-100 text-yellow-800',
  paid: 'border-green-200 bg-green-100 text-green-800',
  closed: 'border-gray-200 bg-gray-100 text-gray-700',
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`inline-flex rounded-[var(--radius-full)] border px-2 py-0.5 text-xs font-medium leading-tight ${statusClass[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
