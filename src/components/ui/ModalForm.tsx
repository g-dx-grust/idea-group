'use client';

import { Plus, X } from 'lucide-react';
import { useId, useRef } from 'react';

interface ModalFormProps {
  title: string;
  triggerLabel: string;
  triggerVariant?: 'primary' | 'secondary';
  triggerClassName?: string;
  showIcon?: boolean;
  children: React.ReactNode;
}

export function ModalForm({
  title,
  triggerLabel,
  triggerVariant = 'primary',
  triggerClassName,
  showIcon = false,
  children,
}: ModalFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        className={triggerClassName ?? `button button-${triggerVariant}`}
        onClick={() => dialogRef.current?.showModal()}
      >
        {showIcon && <Plus className="h-4 w-4" />}
        {triggerLabel}
      </button>
      <dialog ref={dialogRef} className="modal-dialog" aria-labelledby={titleId}>
        <div className="modal-shell">
          <div className="modal-header">
            <h2 id={titleId} className="section-title">
              {title}
            </h2>
            <button
              type="button"
              className="modal-close-button"
              aria-label="閉じる"
              onClick={() => dialogRef.current?.close()}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="modal-body" onSubmit={() => dialogRef.current?.close()}>
            {children}
          </div>
        </div>
      </dialog>
    </>
  );
}
