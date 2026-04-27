import Link from 'next/link';
import { ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { CalendarEventDialogProvider, CalendarEventDialogTrigger } from '@/components/calendar/CalendarEventDialog';
import { calendarEventStatusLabels, calendarEventTypeLabels } from '@/lib/labels';
import { getStore, listCalendarEvents } from '@/lib/store';
import { calendarEventStatuses, calendarEventTypes, type CalendarEvent, type CaseRecord, type User } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

type CalendarView = 'month' | 'week' | 'day';
type CalendarScope = 'all' | 'selected' | 'personal';

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
const viewLabels: Record<CalendarView, string> = {
  month: '月間',
  week: '週間',
  day: '日',
};
const scopeLabels: Record<CalendarScope, string> = {
  all: '全員ビュー',
  selected: '選択者のみビュー',
  personal: '個人ビュー',
};

export default async function CalendarPage({ searchParams }: Props) {
  const params = await searchParams;
  const store = await getStore();
  const view = normalizeView(one(params?.view));
  const scope = normalizeScope(one(params?.scope));
  const anchorDate = normalizeAnchorDate(one(params?.date), one(params?.month));
  const selectedUserIds = normalizeUserIds(many(params?.userIds), store.users);
  const personalUserId = normalizeUserId(one(params?.userId), store.users) ?? store.users[0]?.id;
  const displayedUsers = resolveDisplayedUsers(scope, store.users, selectedUserIds, personalUserId);
  const period = getPeriod(view, anchorDate);
  const rangeEvents = await listCalendarEvents({ startDate: period.startDate, endDate: period.endDate });
  const displayUserIds = new Set(displayedUsers.map((user) => user.id));
  const events = rangeEvents.filter((event) => displayUserIds.has(event.userId));
  const eventsByUserDate = groupEventsByUserDate(events);
  const eventsByDate = groupEventsByDate(events);
  const casesById = new Map(store.cases.map((caseRow) => [caseRow.id, caseRow]));
  const selectedDate = normalizeDate(one(params?.date), formatIsoDate(anchorDate));
  const currentUserIds = displayedUsers.map((user) => user.id);
  const defaultDialogUserId = scope === 'personal' ? personalUserId : displayedUsers[0]?.id;
  const scheduledCount = events.filter((event) => event.status === 'scheduled').length;
  const doneCount = events.filter((event) => event.status === 'done').length;
  const scheduleMinWidth = `${12 + period.days.length * dayColumnRem(view)}rem`;

  return (
    <CalendarEventDialogProvider
      cases={store.cases.map((caseRow) => ({ id: caseRow.id, jutakuNo: caseRow.jutakuNo, title: caseRow.title }))}
      users={store.users.map((user) => ({ id: user.id, name: user.name }))}
      eventTypes={calendarEventTypes}
      eventStatuses={calendarEventStatuses}
      eventTypeLabels={calendarEventTypeLabels}
      eventStatusLabels={calendarEventStatusLabels}
      defaultDate={selectedDate}
      defaultUserId={defaultDialogUserId}
    >
      <div className="content calendar-page">
        <section className="panel calendar-toolbar">
          <div className="calendar-toolbar-main">
            <div className="calendar-title-block">
              <h1 className="page-title">カレンダー</h1>
              <div className="calendar-meta-list" aria-label="表示中の予定数">
                <span>{scopeLabels[scope]}</span>
                <span>{displayedUsers.length}名</span>
                <span>{events.length}件</span>
                <span>予定{scheduledCount}件</span>
                <span>実施{doneCount}件</span>
              </div>
            </div>
            <div className="calendar-action-bar">
              <CalendarEventDialogTrigger
                label="予定を追加する"
                className="button button-primary"
                date={selectedDate}
                userId={defaultDialogUserId}
                showIcon
              />
              <div className="calendar-nav-group" aria-label="期間移動">
                <Link href={calendarHref({ view, scope, date: period.prevDate, userId: personalUserId, userIds: currentUserIds })} className="button button-secondary">
                  <ChevronLeft className="h-4 w-4" />
                  {period.prevLabel}
                </Link>
                <Link href={calendarHref({ view, scope, date: formatIsoDate(new Date()), userId: personalUserId, userIds: currentUserIds })} className="button button-secondary">
                  今日
                </Link>
                <Link href={calendarHref({ view, scope, date: period.nextDate, userId: personalUserId, userIds: currentUserIds })} className="button button-secondary">
                  {period.nextLabel}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="calendar-toolbar-controls">
            <div className="calendar-control-group">
              <span className="field-label">表示形式</span>
              <div className="segmented-control">
                {(['month', 'week', 'day'] as const).map((nextView) => (
                  <Link
                    key={nextView}
                    href={calendarHref({ view: nextView, scope, date: formatIsoDate(anchorDate), userId: personalUserId, userIds: currentUserIds })}
                    className={`segmented-link ${view === nextView ? 'is-active' : ''}`}
                  >
                    {viewLabels[nextView]}
                  </Link>
                ))}
              </div>
            </div>
            <div className="calendar-control-group">
              <span className="field-label">対象者</span>
              <div className="segmented-control">
                {(['all', 'selected', 'personal'] as const).map((nextScope) => (
                  <Link
                    key={nextScope}
                    href={calendarHref({ view, scope: nextScope, date: formatIsoDate(anchorDate), userId: personalUserId, userIds: currentUserIds })}
                    className={`segmented-link ${scope === nextScope ? 'is-active' : ''}`}
                  >
                    {scopeLabels[nextScope]}
                  </Link>
                ))}
              </div>
            </div>
            <details className="calendar-filter-panel">
              <summary className="button button-secondary">
                <ListFilter className="h-4 w-4" />
                表示条件
              </summary>
              <form className="calendar-filter-form">
                <input type="hidden" name="view" value={view} />
                <input type="hidden" name="date" value={formatIsoDate(anchorDate)} />
                <label className="grid gap-2">
                  <span className="field-label">選択者のみビューの担当者</span>
                  <span className="calendar-user-checks">
                    {store.users.map((user) => (
                      <label key={user.id} className="calendar-user-check">
                        <input type="checkbox" name="userIds" value={user.id} defaultChecked={scope === 'selected' ? currentUserIds.includes(user.id) : true} />
                        <span>{user.name}</span>
                      </label>
                    ))}
                  </span>
                </label>
                <label className="grid gap-2">
                  <span className="field-label">個人ビュー</span>
                  <select name="userId" defaultValue={personalUserId} className="control">
                    {store.users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="field-label">表示対象</span>
                  <select name="scope" defaultValue={scope} className="control">
                    <option value="all">全員ビュー</option>
                    <option value="selected">選択者のみビュー</option>
                    <option value="personal">個人ビュー</option>
                  </select>
                </label>
                <button type="submit" className="button button-primary">
                  適用する
                </button>
              </form>
            </details>
          </div>
        </section>

        <section className="panel calendar-board" aria-labelledby="calendar-board-title">
          <div className="calendar-board-header">
            <div>
              <h2 id="calendar-board-title" className="section-title">{period.title}</h2>
              <div className="muted text-[length:var(--font-s)]">{period.startDate} - {period.endDate}</div>
            </div>
            <div className="calendar-legend" aria-label="予定状態">
              <span className="calendar-legend-item calendar-legend-scheduled">予定</span>
              <span className="calendar-legend-item calendar-legend-done">実施済み</span>
              <span className="calendar-legend-item calendar-legend-cancelled">中止</span>
            </div>
          </div>
          <div className="calendar-scroll">
            <table
              className={`calendar-schedule-table calendar-view-${view}`}
              style={{ minWidth: scheduleMinWidth }}
            >
              <thead>
                <tr>
                  <th className="calendar-user-head">担当者</th>
                  {period.days.map((date) => {
                    const isoDate = formatIsoDate(date);
                    const dayCount = eventsByDate.get(isoDate) ?? 0;
                    return (
                      <th key={isoDate} className={`calendar-period-head ${isToday(date) ? 'is-today' : ''} ${isWeekend(date) ? 'is-weekend' : ''}`}>
                        <Link href={calendarHref({ view, scope, date: isoDate, userId: personalUserId, userIds: currentUserIds })} className="calendar-period-link">
                          <span>{formatColumnHeader(date, view)}</span>
                          <span className="calendar-day-count">{dayCount}件</span>
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((user) => (
                  <tr key={user.id}>
                    <th className="calendar-user-cell">
                      <span className="font-semibold">{user.name}</span>
                      <span className="muted text-[length:var(--font-xs)]">{user.department}</span>
                    </th>
                    {period.days.map((date) => {
                      const isoDate = formatIsoDate(date);
                      const dayEvents = eventsByUserDate.get(`${user.id}:${isoDate}`) ?? [];
                      return (
                        <td key={isoDate} className={`calendar-schedule-cell ${isToday(date) ? 'is-today' : ''} ${isWeekend(date) ? 'is-weekend' : ''}`}>
                          <CalendarEventDialogTrigger
                            label="追加"
                            ariaLabel={`${user.name}の${formatColumnHeader(date, view)}に予定を追加する`}
                            className="calendar-cell-add"
                            date={isoDate}
                            userId={user.id}
                            showIcon
                            hideLabel
                          />
                          <div className="calendar-event-stack">
                            {dayEvents.map((event) => (
                              <CalendarEventLink key={event.id} event={event} caseRow={casesById.get(event.caseId)} />
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </CalendarEventDialogProvider>
  );
}

function CalendarEventLink({ event, caseRow }: { event: CalendarEvent; caseRow?: CaseRecord }) {
  return (
    <Link href={`/cases/${event.caseId}?tab=site-visits`} className={`calendar-event calendar-event-${event.status}`}>
      <span className="calendar-event-topline">
        <span className="calendar-event-time">{formatTimeRange(event)}</span>
        <span className="calendar-event-status">{calendarEventStatusLabels[event.status]}</span>
      </span>
      <span className="calendar-event-title">{event.title}</span>
      <span className="calendar-event-user">{caseRow?.jutakuNo ?? '案件未設定'} / {calendarEventTypeLabels[event.type]}</span>
    </Link>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function many(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeView(value: string | undefined): CalendarView {
  return value === 'week' || value === 'day' ? value : 'month';
}

function normalizeScope(value: string | undefined): CalendarScope {
  return value === 'selected' || value === 'personal' ? value : 'all';
}

function normalizeAnchorDate(dateValue: string | undefined, monthValue: string | undefined) {
  if (dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return parseIsoDate(dateValue);
  if (monthValue && /^\d{4}-\d{2}$/.test(monthValue)) return parseIsoDate(`${monthValue}-01`);
  return new Date();
}

function normalizeDate(value: string | undefined, fallback: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return fallback;
}

function normalizeUserId(value: string | undefined, users: User[]) {
  if (!value || value === 'all') return undefined;
  return users.some((user) => user.id === value) ? value : undefined;
}

function normalizeUserIds(values: string[], users: User[]) {
  const userIds = new Set(users.map((user) => user.id));
  return values.filter((value) => userIds.has(value));
}

function resolveDisplayedUsers(scope: CalendarScope, users: User[], selectedUserIds: string[], personalUserId?: string) {
  if (scope === 'personal') {
    return users.filter((user) => user.id === personalUserId).slice(0, 1);
  }
  if (scope === 'selected') {
    if (selectedUserIds.length === 0) return users;
    return users.filter((user) => selectedUserIds.includes(user.id));
  }
  return users;
}

function getPeriod(view: CalendarView, anchorDate: Date) {
  if (view === 'day') {
    const date = new Date(anchorDate);
    return {
      days: [date],
      startDate: formatIsoDate(date),
      endDate: formatIsoDate(date),
      title: formatDateTitle(date),
      prevDate: formatIsoDate(addDays(date, -1)),
      nextDate: formatIsoDate(addDays(date, 1)),
      prevLabel: '前日',
      nextLabel: '次日',
    };
  }

  if (view === 'week') {
    const start = addDays(anchorDate, -anchorDate.getDay());
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    return {
      days,
      startDate: formatIsoDate(days[0] ?? start),
      endDate: formatIsoDate(days[6] ?? start),
      title: `${formatDateShort(days[0] ?? start)} - ${formatDateShort(days[6] ?? start)}`,
      prevDate: formatIsoDate(addDays(start, -7)),
      nextDate: formatIsoDate(addDays(start, 7)),
      prevLabel: '前週',
      nextLabel: '次週',
    };
  }

  const firstDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const lastDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  const days = Array.from({ length: lastDay.getDate() }, (_, index) => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), index + 1));
  return {
    days,
    startDate: formatIsoDate(firstDay),
    endDate: formatIsoDate(lastDay),
    title: new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long' }).format(firstDay),
    prevDate: formatIsoDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 1)),
    nextDate: formatIsoDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1)),
    prevLabel: '前月',
    nextLabel: '次月',
  };
}

function groupEventsByUserDate(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = `${event.userId}:${event.date}`;
    const dayEvents = map.get(key) ?? [];
    dayEvents.push(event);
    map.set(key, dayEvents);
  }
  return map;
}

function groupEventsByDate(events: CalendarEvent[]) {
  const map = new Map<string, number>();
  for (const event of events) {
    map.set(event.date, (map.get(event.date) ?? 0) + 1);
  }
  return map;
}

function calendarHref(input: { view: CalendarView; scope: CalendarScope; date: string; userId?: string; userIds: string[] }) {
  const params = new URLSearchParams();
  params.set('view', input.view);
  params.set('scope', input.scope);
  params.set('date', input.date);
  if (input.userId) params.set('userId', input.userId);
  for (const userId of input.userIds) {
    params.append('userIds', userId);
  }
  return `/calendar?${params.toString()}`;
}

function formatColumnHeader(date: Date, view: CalendarView) {
  const weekday = weekdays[date.getDay()] ?? '';
  if (view === 'month') return `${date.getDate()} ${weekday}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${weekday}`;
}

function dayColumnRem(view: CalendarView) {
  if (view === 'day') return 44;
  if (view === 'week') return 16;
  return 9.5;
}

function formatDateTitle(date: Date) {
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat('ja-JP', { month: '2-digit', day: '2-digit' }).format(date);
}

function formatTimeRange(event: CalendarEvent) {
  if (event.startTime && event.endTime) return `${event.startTime}-${event.endTime}`;
  return event.startTime ?? event.endTime ?? '終日';
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function parseIsoDate(value: string) {
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isToday(date: Date) {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}
