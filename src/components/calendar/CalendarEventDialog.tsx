'use client';

import Link from 'next/link';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { createContext, useContext, useEffect, useId, useRef, useState, useTransition } from 'react';
import { addCalendarEventAction, deleteCalendarEventAction, updateCalendarEventAction } from '@/lib/actions';
import type { CalendarEvent, CalendarEventStatus, CalendarEventType } from '@/lib/types';

interface CaseOption {
  id: string;
  jutakuNo: string;
  title: string;
}

interface UserOption {
  id: string;
  name: string;
}

type DialogMode = 'create' | 'edit';

interface CalendarEventDraft {
  mode: DialogMode;
  caseId: string;
  userId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type?: CalendarEventType;
  status?: CalendarEventStatus;
  title?: string;
  location?: string;
  note?: string;
  eventId?: string;
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

interface CalendarEventEditTriggerProps {
  event: CalendarEvent;
  className?: string;
  ariaLabel?: string;
  hideLabel?: boolean;
  children?: React.ReactNode;
}

const CalendarEventDialogContext = createContext<{
  open: (draft?: Partial<CalendarEventDraft>) => void;
  openForEdit: (event: CalendarEvent) => void;
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
    mode: 'create',
    caseId: cases[0]?.id ?? '',
    userId: defaultUserId ?? users[0]?.id ?? '',
    date: defaultDate,
  });
  const [isDeleting, startDelete] = useTransition();

  function open(nextDraft: Partial<CalendarEventDraft> = {}) {
    setDraft({
      mode: nextDraft.mode ?? 'create',
      caseId: nextDraft.caseId ?? '',
      userId: nextDraft.userId ?? defaultUserId ?? users[0]?.id ?? '',
      date: nextDraft.date ?? defaultDate,
      startTime: nextDraft.startTime,
      endTime: nextDraft.endTime,
      type: nextDraft.type,
      status: nextDraft.status,
      title: nextDraft.title,
      location: nextDraft.location,
      note: nextDraft.note,
      eventId: nextDraft.eventId,
    });
    setFormKey((current) => current + 1);
    setIsOpen(true);
  }

  function openForEdit(event: CalendarEvent) {
    open({
      mode: 'edit',
      caseId: event.caseId ?? '',
      userId: event.userId,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      type: event.type,
      status: event.status,
      title: event.title,
      location: event.location,
      note: event.note,
      eventId: event.id,
    });
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

  const canSubmit = users.length > 0;
  const isEdit = draft.mode === 'edit';
  const formAction = isEdit && draft.eventId
    ? updateCalendarEventAction.bind(null, draft.eventId)
    : addCalendarEventAction;

  function handleDelete() {
    if (!draft.eventId || isDeleting) return;
    if (!window.confirm('この予定を削除します。よろしいですか？')) return;
    const eventId = draft.eventId;
    const caseId = draft.caseId;
    startDelete(() => {
      deleteCalendarEventAction(eventId, caseId)
        .then(() => close())
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : '削除に失敗しました。';
          window.alert(message);
        });
    });
  }

  return (
    <CalendarEventDialogContext.Provider value={{ open, openForEdit }}>
      {children}
      <dialog ref={dialogRef} className="modal-dialog" aria-labelledby={titleId} onClose={() => setIsOpen(false)}>
        <div className="modal-shell">
          <div className="modal-header">
            <h2 id={titleId} className="section-title">
              {isEdit ? '予定を編集する' : '予定を追加する'}
            </h2>
            <button type="button" className="modal-close-button" aria-label="閉じる" onClick={close}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="modal-body">
            <form key={formKey} action={formAction} className="modal-form" onSubmit={close}>
              {!isEdit && (
                <div className="flex justify-end">
                  <Link href="/cases/new" className="button button-secondary">
                    <Plus className="h-4 w-4" />
                    新規現場
                  </Link>
                </div>
              )}
              <label className="grid gap-2">
                <span className="field-label">案件（任意）</span>
                <select name="caseId" className="control" defaultValue={draft.caseId}>
                  <option value="">案件なし</option>
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
                <Field label="開始時刻" name="startTime" type="time" value={draft.startTime} />
                <Field label="終了時刻" name="endTime" type="time" value={draft.endTime} />
                <label className="grid gap-2">
                  <span className="field-label">種別</span>
                  <select name="type" defaultValue={draft.type ?? 'site_visit'} className="control">
                    {eventTypes.map((type) => (
                      <option key={type} value={type}>
                        {eventTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="field-label">状態</span>
                  <select name="status" defaultValue={draft.status ?? 'scheduled'} className="control">
                    {eventStatuses.map((status) => (
                      <option key={status} value={status}>
                        {eventStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Field label="件名" name="title" value={draft.title ?? '現地訪問'} />
              <Field label="場所" name="location" value={draft.location} />
              <label className="grid gap-2">
                <span className="field-label">備考</span>
                <textarea name="note" className="control min-h-24" defaultValue={draft.note ?? ''} />
              </label>
              {!canSubmit && <div className="muted">予定を登録するには担当者が必要です。</div>}
              <div className="modal-actions">
                {isEdit && draft.caseId && (
                  <Link
                    href={`/cases/${draft.caseId}?tab=site-visits`}
                    className="button button-secondary"
                    onClick={close}
                  >
                    現場を開く
                  </Link>
                )}
                {isEdit && (
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? '処理中…' : '削除する'}
                  </button>
                )}
                <button type="submit" className="button button-primary" disabled={!canSubmit}>
                  {isEdit ? '更新する' : '予定を追加する'}
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
      onClick={() => dialog?.open({ mode: 'create', date, userId, caseId })}
    >
      {showIcon && <Plus className="h-4 w-4" />}
      <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
    </button>
  );
}

export function CalendarEventEditTrigger({ event, className, ariaLabel, hideLabel = false, children }: CalendarEventEditTriggerProps) {
  const dialog = useContext(CalendarEventDialogContext);

  return (
    <button
      type="button"
      className={className ?? 'calendar-event-edit'}
      aria-label={ariaLabel ?? (hideLabel ? '予定を編集する' : undefined)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialog?.openForEdit(event);
      }}
    >
      {children ?? (
        <>
          <Pencil className="h-4 w-4" />
          {!hideLabel && <span>編集</span>}
        </>
      )}
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
