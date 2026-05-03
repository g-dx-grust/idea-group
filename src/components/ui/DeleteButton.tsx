'use client';

import { Trash2 } from 'lucide-react';
import { useTransition } from 'react';

interface DeleteButtonProps {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  showIcon?: boolean;
  className?: string;
}

export function DeleteButton({
  action,
  confirmMessage,
  label = '削除する',
  showIcon = false,
  className,
}: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isPending) return;
    if (!window.confirm(confirmMessage)) return;
    startTransition(() => {
      action().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '削除に失敗しました。';
        window.alert(message);
      });
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={className ?? 'button button-danger'}
    >
      {showIcon && <Trash2 className="h-4 w-4" />}
      {isPending ? '処理中…' : label}
    </button>
  );
}
