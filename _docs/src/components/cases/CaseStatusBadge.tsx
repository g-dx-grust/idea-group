import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
    draft:       { label: '下書き',   className: 'border-[var(--color-border)] bg-[var(--color-over-background)] text-[var(--color-text-grey)]' },
    in_progress: { label: '進行中',   className: 'border-[var(--color-main)] bg-[var(--color-column)] text-[var(--color-main)]' },
    done:        { label: '成果完了', className: 'border-[var(--color-success)] bg-[var(--color-column)] text-[var(--color-success)]' },
    invoiced:    { label: '請求済',   className: 'border-[var(--color-warning)] bg-[var(--color-warning)] text-[var(--color-text-black)]' },
    paid:        { label: '入金済',   className: 'border-[var(--color-success)] bg-[var(--color-column)] text-[var(--color-success)]' },
    closed:      { label: '終了',     className: 'border-[var(--color-border)] bg-[var(--color-over-background)] text-[var(--color-text-grey)]' },
};

export function CaseStatusBadge({ status }: { status: string }) {
    const config = STATUS_MAP[status] ?? {
        label: status,
        className: 'border-[var(--color-border)] bg-[var(--color-over-background)] text-[var(--color-text-grey)]',
    };

    return (
        <Badge className={cn('rounded-[var(--radius-full)] border px-[var(--space-s)] text-[length:var(--font-xs)] font-bold leading-[var(--leading-tight)]', config.className)}>
            {config.label}
        </Badge>
    );
}
