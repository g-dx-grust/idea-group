'use client';

import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { addCalendarEventAction } from '@/lib/actions';
import type { CalendarEventStatus, CalendarEventType } from '@/lib/types';

interface CaseOption {
  id: string;
  jutakuNo: string;
  title: string;
}

interface UserOption {
  id: string;
  name: string;
}

interface CalendarEventDraft {
  caseId: string;
  userId: string;
  date: string;
}

interface CalendarEventDialogProviderProps {
  cases: CaseOption[];
  users: UserOption[];
  eventTypes: readonly CalendarEventType[];
  eventStatuses: readonly CalendarEventStatus[];
  eventTypeLabels: Record<CalendarEventType, string>;
  eventStatusLabels: Record<CalendarEventStatus, string>;
  defaultDate: string;
  defaultUserId?: string;
  children: React.ReactNode;
}

interface CalendarEventDialogTriggerProps {
  label: string;
  ariaLabel?: string;
  date?: string;
  userId?: string;
  caseId?: string;
  className?: string;
  showIcon?: boolean;
  hideLabel?: boolean;
}

const CalendarEventDialogContext = createContext<{
  open: (draft?: Partial<CalendarEventDraft>) => void;
} | null>(null);

export function CalendarEventDialogProvider({
  cases,
  users,
  eventTypes,
  eventStatuses,
  eventTypeLabels,
  eventStatusLabels,
  defaultDate,
  defaultUserId,
  children,
}: CalendarEventDialogProviderProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [formKey, setFormKey] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<CalendarEventDraft>({
    caseId: cases[0]?.id ?? '',
    userId: defaultUserId ?? users[0]?.id ?? '',
    date: defaultDate,
  });

  function open(nextDraft: Partial<CalendarEventDraft> = {}) {
    setDraft({
      caseId: nextDraft.caseId ?? draft.caseId ?? cases[0]?.id ?? '',
      userId: nextDraft.userId ?? defaultUserId ?? users[0]?.id ?? '',
      date: nextDraft.date ?? defaultDate,
    });
    setFormKey((current) => current + 1);
    setIsOpen(true);
  }

  function close() {
    dialogRef.current?.close();
    setIsOpen(false);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog || dialog.open) return;
    dialog.showModal();
  }, [isOpen, formKey]);

  const canSubmit = cases.length > 0 && users.length > 0;

  return (
    <CalendarEventDialogContext.Provider value={{ open }}>
      {children}
      <dialog ref={dialogRef} className="modal-dialog" aria-labelledby={titleId} onClose={() => setIsOpen(false)}>
        <div className="modal-shell">
          <div className="modal-header">
            <h2 id={titleId} className="section-title">
              予定を追加する
            </h2>
            <button type="button" className="modal-close-button" aria-label="閉じる" onClick={close}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="modal-body">
            <form key={formKey} action={addCalendarEventAction} className="modal-form" onSubmit={close}>
              <div className="flex justify-end">
                <Link href="/cases/new" className="button button-secondary">
                  <Plus className="h-4 w-4" />
                  新規現場
                </Link>
              </div>
              <label className="grid gap-2">
                <span className="field-label">案件</span>
                <select name="caseId" required className="control" defaultValue={draft.caseId} disabled={!cases.length}>
                  {cases.map((caseRow) => (
                    <option key={caseRow.id} value={caseRow.id}>
                      {caseRow.jutakuNo} {caseRow.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="予定日" name="date" type="date" required value={draft.date} />
                <label className="grid gap-2">
                  <span className="field-label">担当者</span>
                  <select name="userId" required defaultValue={draft.userId} className="control" disabled={!users.length}>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="開始時刻" name="startTime" type="time" />
                <Field label="終了時刻" name="endTime" type="time" />
                <label className="grid gap-2">
                  <span className="field-label">種別</span>
                  <select name="type" defaultValue="site_visit" className="control">
                    {eventTypes.map((type) => (
                      <option key={type} value={type}>
                        {eventTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="field-label">状態</span>
                  <select name="status" defaultValue="scheduled" className="control">
                    {eventStatuses.map((status) => (
                      <option key={status} value={status}>
                        {eventStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Field label="件名" name="title" value="現地訪問" />
              <Field label="場所" name="location" />
              <label className="grid gap-2">
                <span className="field-label">備考</span>
                <textarea name="note" className="control min-h-24" />
              </label>
              {!canSubmit && <div className="muted">予定を登録するには現場と担当者が必要です。</div>}
              <div className="modal-actions">
                <button type="submit" className="button button-primary" disabled={!canSubmit}>
                  予定を追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </CalendarEventDialogContext.Provider>
  );
}

export function CalendarEventDialogTrigger({
  label,
  ariaLabel,
  date,
  userId,
  caseId,
  className,
  showIcon = false,
  hideLabel = false,
}: CalendarEventDialogTriggerProps) {
  const dialog = useContext(CalendarEventDialogContext);

  return (
    <button
      type="button"
      className={className ?? 'button button-primary'}
      aria-label={ariaLabel ?? (hideLabel ? label : undefined)}
      onClick={() => dialog?.open({ date, userId, caseId })}
    >
      {showIcon && <Plus className="h-4 w-4" />}
      <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
    </button>
  );
}

function Field({
  label,
  name,
  value,
  required,
  type = 'text',
}: {
  label: string;
  name: string;
  value?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="field-label">{label}</span>
      <input name={name} type={type} defaultValue={value ?? ''} required={required} className="control" />
    </label>
  );
}
