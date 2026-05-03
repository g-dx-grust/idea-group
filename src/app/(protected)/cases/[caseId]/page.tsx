import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, FileText } from 'lucide-react';
import { BusinessBadges } from '@/components/cases/BusinessBadges';
import { CaseTabs } from '@/components/cases/CaseTabs';
import { StatusBadge } from '@/components/cases/StatusBadge';
import { RewardSummary } from '@/components/rewards/RewardSummary';
import { ModalForm } from '@/components/ui/ModalForm';
import {
  addCaseCalendarEventAction,
  addLandAction,
  addSiteVisitAction,
  saveRewardAction,
  updateCaseSummaryAction,
  updateConfirmedSurveyAction,
  updateLandAction,
  updateSubdivisionSurveyAction,
} from '@/lib/actions';
import { businessTypeLabels, calendarEventStatusLabels, calendarEventTypeLabels, rewardSectionLabels, siteVisitAppliedToLabels, statusLabels } from '@/lib/labels';
import { calculateRewardDetailAmount, formatCurrency } from '@/lib/rewards';
import { getCase, getStore } from '@/lib/store';
import {
  calendarEventStatuses,
  calendarEventTypes,
  caseStatuses,
  rewardSections,
  type CalendarEvent,
  type CaseRecord,
  type Land,
  type LandOwner,
  type RewardDetail,
  type RewardRecord,
  type RewardSection,
  type SurveyProgress,
  type UnitPrice,
  type User,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ caseId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const allowedTabs = ['summary', 'confirmed', 'subdivision', 'lands', 'site-visits', 'rewards', 'documents'] as const;

export default async function CaseDetailPage({ params, searchParams }: Props) {
  const [{ caseId }, query, store] = await Promise.all([params, searchParams, getStore()]);
  const caseRow = await getCase(caseId);
  if (!caseRow) notFound();

  const tabParam = Array.isArray(query?.tab) ? query?.tab[0] : query?.tab;
  const activeTab = allowedTabs.includes(tabParam as (typeof allowedTabs)[number]) ? String(tabParam) : 'summary';
  const client = store.clients.find((item) => item.id === caseRow.clientId);
  const users = store.users;
  const calendarEvents = store.calendarEvents
    .filter((event) => event.caseId === caseRow.id)
    .sort((a, b) => `${a.date}${a.startTime ?? ''}`.localeCompare(`${b.date}${b.startTime ?? ''}`));

  return (
    <div>
      <header className="bg-[var(--color-white)]">
        <div className="content py-5">
          <Link href="/cases" className="muted hover:text-[var(--color-text-black)]">
            現場一覧へ戻る
          </Link>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="page-title">
                  <span className="mono">{caseRow.jutakuNo}</span> {caseRow.title}
                </h1>
                <StatusBadge status={caseRow.status} />
              </div>
              <p className="muted mt-[var(--space-xs)]">{caseRow.address}</p>
              <p className="muted">{client?.name ?? '依頼先未設定'}</p>
              <div className="mt-[var(--space-s)]">
                <BusinessBadges types={caseRow.businessTypes} />
              </div>
            </div>
            <div className="flex flex-wrap gap-[var(--space-s)]">
              <Link href={`/api/cases/${caseRow.id}/export-pdf?type=jutakubo`} target="_blank" className="button button-secondary">
                <Download className="h-4 w-4" />
                受託簿を出力する
              </Link>
              <Link href={`/cases/${caseRow.id}?tab=rewards`} className="button button-primary">
                <FileText className="h-4 w-4" />
                報酬計算へ進む
              </Link>
            </div>
          </div>
        </div>
      </header>
      <CaseTabs caseId={caseRow.id} active={activeTab} />
      <div className="content space-y-6">
        {activeTab === 'summary' && <SummaryTab caseRow={caseRow} users={users} />}
        {activeTab === 'confirmed' && <SurveyTab title="確定測量" caseId={caseRow.id} progress={caseRow.confirmedSurvey} action={updateConfirmedSurveyAction.bind(null, caseRow.id)} />}
        {activeTab === 'subdivision' && <SurveyTab title="分筆測量" caseId={caseRow.id} progress={caseRow.subdivisionSurvey} action={updateSubdivisionSurveyAction.bind(null, caseRow.id)} />}
        {activeTab === 'lands' && <LandsTab caseRow={caseRow} />}
        {activeTab === 'site-visits' && <SiteVisitsTab caseRow={caseRow} users={users} calendarEvents={calendarEvents} />}
        {activeTab === 'rewards' && <RewardsTab caseRow={caseRow} unitPrices={store.unitPrices} />}
        {activeTab === 'documents' && <DocumentsTab caseRow={caseRow} />}
      </div>
    </div>
  );
}

function SummaryTab({ caseRow, users }: { caseRow: CaseRecord; users: User[] }) {
  return (
    <form action={updateCaseSummaryAction.bind(null, caseRow.id)} className="panel grid gap-6 p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2">
          <span className="field-label">ステータス</span>
          <select name="status" defaultValue={caseRow.status} className="control">
            {caseStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <Field label="期限" name="deadline" type="date" value={caseRow.deadline} />
        <Field label="現場フォルダ" name="folderPath" value={caseRow.folderPath} />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="設計箱番号" name="boxNoDesign" value={caseRow.boxNoDesign} />
        <Field label="測量箱番号" name="boxNoSurvey" value={caseRow.boxNoSurvey} />
        <Field label="土地登記箱番号 東新" name="boxNoRegTohshin" value={caseRow.boxNoRegTohshin} />
        <Field label="土地登記箱番号 その他" name="boxNoRegOther" value={caseRow.boxNoRegOther} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <ReadOnly label="設計担当" value={userName(users, caseRow.designerUserId)} />
        <ReadOnly label="測量担当" value={userName(users, caseRow.surveyorUserId)} />
        <ReadOnly label="登記担当" value={userName(users, caseRow.registrarUserId)} />
      </div>
      <label className="grid gap-2">
        <span className="field-label">特記事項</span>
        <textarea name="specialNote" defaultValue={caseRow.specialNote ?? ''} className="control min-h-28" />
      </label>
      <div className="flex justify-end">
        <button type="submit" className="button button-primary">
          保存する
        </button>
      </div>
    </form>
  );
}

function SurveyTab({ title, caseId, progress, action }: { title: string; caseId: string; progress: SurveyProgress; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="panel grid gap-6 p-6">
      <h2 className="section-title">{title}</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="受託日" name="acceptedDate" type="date" value={progress.acceptedDate} />
        <label className="grid gap-2">
          <span className="field-label">予定 / 決定</span>
          <select name="scheduleOrDecided" defaultValue={progress.scheduleOrDecided ?? 'scheduled'} className="control">
            <option value="scheduled">予定</option>
            <option value="decided">決定</option>
          </select>
        </label>
        <Field label="法務局調査日" name="houmuInvestDate" type="date" value={progress.houmuInvestDate} />
        <Field label="役所調査日" name="cityInvestDate" type="date" value={progress.cityInvestDate} />
        <Field label="整理図閲覧日" name="seirizuBrowseDate" type="date" value={progress.seirizuBrowseDate} />
        <label className="flex min-h-11 items-center gap-[var(--space-s)] self-end">
          <input type="checkbox" name="hasSeirizuBrowse" defaultChecked={progress.hasSeirizuBrowse ?? Boolean(progress.seirizuBrowseDate)} />
          <span className="font-medium">整理図閲覧有</span>
        </label>
        <Field label="押印依頼日" name="stampRequestDate" type="date" value={progress.stampRequestDate} />
        <Field label="押印返却日" name="stampReturnDate" type="date" value={progress.stampReturnDate} />
        <Field label="隣地挨拶文送付日" name="neighborSendDate" type="date" value={progress.neighborSendDate} />
        <Field label="立会挨拶文送付日" name="siteVisitSendDate" type="date" value={progress.siteVisitSendDate} />
        <Field label="官立会申請日" name="officialApplicationDate" type="date" value={progress.officialApplicationDate} />
        <Field label="官立会日" name="officialMeetingDate" type="date" value={progress.officialMeetingDate} />
        <Field label="証明書申請日" name="certRequestDate" type="date" value={progress.certRequestDate} />
        <Field label="証明書押印日" name="certStampRequestDate" type="date" value={progress.certStampRequestDate} />
        <Field label="証明書提出日" name="certSubmittedDate" type="date" value={progress.certSubmittedDate} />
        <Field label="証明書返却日" name="certReturnDate" type="date" value={progress.certReturnDate} />
        <Field label="証明書回収日" name="certCollectedDate" type="date" value={progress.certCollectedDate} />
        <Field label="成果完了日" name="completedDate" type="date" value={progress.completedDate} />
      </div>
      <div className="flex flex-wrap justify-end gap-[var(--space-s)]">
        <Link href={`/api/cases/${caseId}/export-pdf?type=progress`} target="_blank" className="button button-secondary">
          管理工程表PDF
        </Link>
        <Link href={`/api/cases/${caseId}/export-pdf?type=jutakubo`} target="_blank" className="button button-secondary">
          受託簿
        </Link>
        <button type="submit" className="button button-primary">
          工程を保存する
        </button>
      </div>
    </form>
  );
}

function LandsTab({ caseRow }: { caseRow: CaseRecord }) {
  return (
    <div className="grid gap-6">
      <section className="panel">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-6 md:flex-row md:items-center md:justify-between">
          <h2 className="section-title">土地明細</h2>
          <ModalForm title="土地を追加する" triggerLabel="土地を追加する" showIcon>
            <form action={addLandAction.bind(null, caseRow.id)} className="modal-form">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="不動産番号" name="fudoNo" />
                <Field label="所在" name="address" required value={caseRow.address} />
                <Field label="地番" name="chiban" required />
                <Field label="枝番" name="edaban" />
                <Field label="地目" name="chimoku" />
                <Field label="地積(m²)" name="chiseki" type="number" />
                <Field label="入力日" name="inputDate" type="date" value={currentDate()} />
                <Field label="所有者名" name="ownerName" />
                <Field label="所有者住所" name="ownerAddress" />
                <Field label="持分" name="ownerShare" />
                <Field label="所有者郵便番号" name="ownerPostalCode" />
                <Field label="所有者電話番号" name="ownerTel" />
              </div>
              <div className="modal-actions">
                <button type="submit" className="button button-primary">
                  土地を追加する
                </button>
              </div>
            </form>
          </ModalForm>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>所在</th>
                <th>地番</th>
                <th>枝番</th>
                <th>地目</th>
                <th>地積(m²)</th>
                <th>入力日</th>
                <th>持分</th>
                <th>氏名商号</th>
                <th>住所</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {caseRow.lands.map((land) => {
                const owner = land.owners[0];
                return (
                  <tr key={land.id}>
                    <td>{land.address}</td>
                    <td className="mono">{land.chiban}</td>
                    <td className="mono">{land.edaban ?? '-'}</td>
                    <td>{land.chimoku ?? '-'}</td>
                    <td className="mono">{formatArea(land.chiseki)}</td>
                    <td className="mono">{land.inputDate ?? '-'}</td>
                    <td>{joinOwnerValues(land.owners, 'share')}</td>
                    <td>{joinOwnerValues(land.owners, 'name')}</td>
                    <td>{joinOwnerValues(land.owners, 'address')}</td>
                    <td>
                      <ModalForm
                        title="土地を編集する"
                        triggerLabel="編集する"
                        triggerVariant="secondary"
                      >
                        <form action={updateLandAction.bind(null, caseRow.id, land.id)} className="modal-form">
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label="不動産番号" name="fudoNo" value={land.fudoNo} />
                            <Field label="所在" name="address" required value={land.address} />
                            <Field label="地番" name="chiban" required value={land.chiban} />
                            <Field label="枝番" name="edaban" value={land.edaban} />
                            <Field label="地目" name="chimoku" value={land.chimoku} />
                            <Field label="地積(m²)" name="chiseki" type="number" value={land.chiseki !== undefined ? String(land.chiseki) : undefined} />
                            <Field label="入力日" name="inputDate" type="date" value={land.inputDate} />
                            <Field label="所有者名" name="ownerName" value={owner?.name} />
                            <Field label="所有者住所" name="ownerAddress" value={owner?.address} />
                            <Field label="持分" name="ownerShare" value={owner?.share} />
                            <Field label="所有者郵便番号" name="ownerPostalCode" value={owner?.postalCode} />
                            <Field label="所有者電話番号" name="ownerTel" value={owner?.tel} />
                          </div>
                          <div className="modal-actions">
                            <button type="submit" className="button button-primary">
                              更新する
                            </button>
                          </div>
                        </form>
                      </ModalForm>
                    </td>
                  </tr>
                );
              })}
              {caseRow.lands.length === 0 && (
                <tr>
                  <td colSpan={10} className="muted text-center">
                    土地明細はまだありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SiteVisitsTab({ caseRow, users, calendarEvents }: { caseRow: CaseRecord; users: User[]; calendarEvents: CalendarEvent[] }) {
  return (
    <div className="grid gap-6">
      <section className="panel">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-6 md:flex-row md:items-center md:justify-between">
          <h2 className="section-title">訪問予定</h2>
          <div className="flex flex-wrap gap-[var(--space-s)]">
            <ModalForm title="訪問予定を追加する" triggerLabel="訪問予定を追加する" showIcon>
              <form action={addCaseCalendarEventAction.bind(null, caseRow.id)} className="modal-form">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="予定日" name="date" type="date" required value={caseRow.deadline} />
                  <label className="grid gap-2">
                    <span className="field-label">担当者</span>
                    <select name="userId" className="control" defaultValue={caseRow.surveyorUserId ?? caseRow.designerUserId ?? users[0]?.id}>
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
                    <select name="type" className="control" defaultValue="site_visit">
                      {calendarEventTypes.map((type) => (
                        <option key={type} value={type}>
                          {calendarEventTypeLabels[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="field-label">状態</span>
                    <select name="status" className="control" defaultValue="scheduled">
                      {calendarEventStatuses.map((status) => (
                        <option key={status} value={status}>
                          {calendarEventStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field label="件名" name="title" value="現地訪問" />
                  <Field label="場所" name="location" value={caseRow.address} />
                </div>
                <label className="grid gap-2">
                  <span className="field-label">備考</span>
                  <textarea name="note" className="control min-h-24" />
                </label>
                <div className="modal-actions">
                  <button type="submit" className="button button-primary">
                    訪問予定を追加する
                  </button>
                </div>
              </form>
            </ModalForm>
            <Link href={`/calendar?month=${calendarEvents[0]?.date.slice(0, 7) ?? currentMonth()}`} className="button button-secondary">
              カレンダーで見る
            </Link>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>日付</th>
                <th>時間</th>
                <th>担当者</th>
                <th>種別</th>
                <th>件名</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {calendarEvents.map((event) => (
                <tr key={event.id}>
                  <td className="mono">{formatDate(event.date)}</td>
                  <td className="mono">{formatTimeRange(event)}</td>
                  <td>{userName(users, event.userId)}</td>
                  <td>{calendarEventTypeLabels[event.type]}</td>
                  <td>
                    <div className="strong-text">{event.title}</div>
                    <div className="muted text-[length:var(--font-s)]">{event.location ?? caseRow.address}</div>
                  </td>
                  <td>{calendarEventStatusLabels[event.status]}</td>
                </tr>
              ))}
              {calendarEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted text-center">
                    訪問予定はまだありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-6 md:flex-row md:items-center md:justify-between">
          <h2 className="section-title">立会申請</h2>
          <ModalForm title="立会申請を追加する" triggerLabel="立会申請を追加する" showIcon>
            <form action={addSiteVisitAction.bind(null, caseRow.id)} className="modal-form">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="field-label">申請先</span>
                  <select name="appliedTo" className="control">
                    {Object.entries(siteVisitAppliedToLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="申請先（その他）" name="appliedToName" />
                <label className="grid gap-2">
                  <span className="field-label">調査士</span>
                  <select name="surveyorUserId" className="control" defaultValue={caseRow.surveyorUserId ?? users[0]?.id}>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="法務局調査日" name="houmuInvestDate" type="date" value={caseRow.confirmedSurvey.houmuInvestDate} />
                <Field label="路線名1" name="route1" />
                <Field label="路線名2" name="route2" />
                <Field label="路線名3" name="route3" />
                <Field label="路線名4" name="route4" />
                <label className="grid gap-2">
                  <span className="field-label">並び順</span>
                  <select name="sortMode" className="control" defaultValue="input">
                    <option value="input">入力順</option>
                    <option value="chiban">地番順</option>
                  </select>
                </label>
              </div>
              <div>
                <div className="field-label mb-2">対象土地</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {caseRow.lands.map((land) => (
                    <label key={land.id} className="flex min-h-11 items-center gap-3 rounded-[var(--radius-m)] border border-[var(--color-border)] p-3">
                      <input type="checkbox" name="landIds" value={land.id} defaultChecked />
                      <span>{landLabel(land)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="grid gap-2">
                <span className="field-label">備考</span>
                <textarea name="note" className="control min-h-24" />
              </label>
              <div className="modal-actions">
                <button type="submit" className="button button-primary">
                  立会申請を追加する
                </button>
              </div>
            </form>
          </ModalForm>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>申請先</th>
                <th>調査士</th>
                <th>法務局調査日</th>
                <th>路線名</th>
                <th>対象土地</th>
                <th>土地件数</th>
                <th>帳票</th>
                <th>入力日</th>
              </tr>
            </thead>
            <tbody>
              {caseRow.siteVisits.map((siteVisit) => (
                <tr key={siteVisit.id}>
                  <td>{siteVisitAppliedToLabels[siteVisit.appliedTo]}{siteVisit.appliedToName ? `（${siteVisit.appliedToName}）` : ''}</td>
                  <td>{userName(users, siteVisit.surveyorUserId)}</td>
                  <td className="mono">{siteVisit.houmuInvestDate ?? '-'}</td>
                  <td>{siteVisit.routeNames.join(' / ') || '-'}</td>
                  <td>{siteVisitLandSummary(caseRow.lands, siteVisit.landIds)}</td>
                  <td className="mono">{siteVisit.landIds.length}件</td>
                  <td>{siteVisit.generatedDocumentCount}件生成済み</td>
                  <td className="mono">{siteVisit.inputDate}</td>
                </tr>
              ))}
              {caseRow.siteVisits.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted text-center">
                    立会申請はまだありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RewardsTab({ caseRow, unitPrices }: { caseRow: CaseRecord; unitPrices: UnitPrice[] }) {
  const selectedReward = caseRow.rewards[0];
  const rows = buildRewardRows(selectedReward, unitPrices);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form action={saveRewardAction.bind(null, caseRow.id)} className="panel grid gap-6 p-6">
        <input type="hidden" name="rewardId" value={selectedReward?.id ?? ''} />
        <h2 className="section-title">報酬額計算書</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="業務名" name="businessName" required value={selectedReward?.businessName ?? caseRow.title} />
          <Field label="所在" name="address" required value={selectedReward?.address ?? caseRow.address} />
          <Field label="宛名" name="recipientName" required value={selectedReward?.recipientName ?? caseRow.clientContactName} />
          <label className="grid gap-2">
            <span className="field-label">様式</span>
            <select name="formVersion" defaultValue={selectedReward?.formVersion ?? 'new'} className="control">
              <option value="new">新様式</option>
              <option value="old">旧様式</option>
            </select>
          </label>
          <Field label="見積日" name="estimateDate" type="date" value={selectedReward?.estimateDate} />
          <Field label="請求日" name="invoiceDate" type="date" value={selectedReward?.invoiceDate} />
          <Field label="入金日" name="paidDate" type="date" value={selectedReward?.paidDate} />
          <Field label="領収日" name="receiptDate" type="date" value={selectedReward?.receiptDate} />
          <Field label="領収書送付日" name="receiptSentDate" type="date" value={selectedReward?.receiptSentDate} />
        </div>
        <div className="grid gap-5">
          {rewardSections.map((section) => {
            const sectionRows = rows.filter((row) => row.section === section);
            return (
              <section key={section} className="grid gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{rewardSectionLabels[section]}</h3>
                  <div className="mono text-[length:var(--font-s)]">小計 {formatCurrency(rewardSectionSubtotal(rows, section))}</div>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>品目</th>
                        <th>数量</th>
                        <th>単位</th>
                        <th>単価</th>
                        <th>加減率</th>
                        <th>金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionRows.map((row, index) => (
                        <tr key={`${section}-${row.id ?? row.itemName}-${index}`}>
                          <td>
                            <input type="hidden" name="detailId" value={row.id ?? ''} />
                            <input type="hidden" name="detailSection" value={section} />
                            <input name="detailItemName" defaultValue={row.itemName} className="control w-full" />
                          </td>
                          <td><input name="detailQuantity" type="number" step="0.01" defaultValue={row.quantity} className="control w-24" /></td>
                          <td><input name="detailUnit" defaultValue={row.unit} className="control w-20" /></td>
                          <td><input name="detailUnitPrice" type="number" defaultValue={row.unitPrice} className="control w-28" /></td>
                          <td><input name="detailRate" type="number" defaultValue={row.rate} className="control w-24" /></td>
                          <td className="mono">{formatCurrency(rewardRowAmount(row))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <Field label="調整額" name="adjustAmount" type="number" value={String(selectedReward?.adjustAmount ?? 0)} />
          <Field label="諸経費" name="miscExpense" type="number" value={String(selectedReward?.miscExpense ?? 0)} />
          <Field label="立替金" name="stampCost" type="number" value={String(selectedReward?.stampCost ?? 0)} />
          <Field label="税率" name="taxRate" type="number" value={String(selectedReward?.taxRate ?? 10)} />
          <label className="grid gap-2">
            <span className="field-label">端数処理</span>
            <select name="taxRounding" defaultValue={selectedReward?.taxRounding ?? 'floor'} className="control">
              <option value="floor">切り捨て</option>
              <option value="round">四捨五入</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-[var(--space-s)]">
          <input type="checkbox" name="requireSend" defaultChecked={selectedReward?.requireSend ?? false} />
          <span className="font-medium">要送付</span>
        </label>
        <label className="grid gap-2">
          <span className="field-label">備考</span>
          <textarea name="note" defaultValue={selectedReward?.note ?? ''} className="control min-h-24" />
        </label>
        <div className="flex justify-end">
          <button type="submit" className="button button-primary">
            報酬額計算書を保存する
          </button>
        </div>
      </form>
      <aside className="grid content-start gap-[var(--space-m)]">
        {selectedReward ? <RewardSummary totals={selectedReward} /> : <div className="panel p-[var(--space-m)] muted">保存後に集計が表示されます。</div>}
        <section className="panel p-6">
          <h3 className="section-title mb-3">発行済み文書</h3>
          {caseRow.rewards.map((reward) => (
            <div key={reward.id} className="border-b border-[var(--color-border)] py-[var(--space-s)] last:border-b-0">
              <div className="font-medium">{reward.businessName}</div>
              <div className="mono">{formatCurrency(reward.total)}</div>
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}

function DocumentsTab({ caseRow }: { caseRow: CaseRecord }) {
  const reward = caseRow.rewards[0];
  return (
    <section className="panel grid gap-4 p-6">
      <h2 className="section-title">帳票</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Link href={`/api/cases/${caseRow.id}/export-pdf?type=jutakubo`} target="_blank" className="button button-secondary">
          受託簿を出力する
        </Link>
        <Link href={`/api/cases/${caseRow.id}/export-pdf?type=progress`} target="_blank" className="button button-secondary">
          工程表を出力する
        </Link>
        {reward ? (
          <>
            <Link href={`/api/documents/generate?caseId=${caseRow.id}&rewardId=${reward.id}&docType=estimate`} target="_blank" className="button button-secondary">
              見積書を出力する
            </Link>
            <Link href={`/api/documents/generate?caseId=${caseRow.id}&rewardId=${reward.id}&docType=invoice`} target="_blank" className="button button-secondary">
              請求書を出力する
            </Link>
            <Link href={`/api/documents/generate?caseId=${caseRow.id}&rewardId=${reward.id}&docType=reward_calc`} target="_blank" className="button button-secondary">
              報酬額計算書を出力する
            </Link>
          </>
        ) : (
          <div className="muted">報酬額計算書を保存すると見積書・請求書を出力できます。</div>
        )}
      </div>
    </section>
  );
}

function Field({ label, name, value, required, type = 'text' }: { label: string; name: string; value?: string; required?: boolean; type?: string }) {
  return (
    <label className="grid gap-2">
      <span className="field-label">{label}</span>
      <input name={name} type={type} defaultValue={value ?? ''} required={required} className="control" />
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2">
      <span className="field-label">{label}</span>
      <div className="control bg-[var(--color-head)]">{value}</div>
    </div>
  );
}

type RewardRow = Pick<RewardDetail, 'section' | 'itemName' | 'unitPrice' | 'quantity' | 'unit' | 'rate'> & {
  id?: string;
  amount?: number;
};

function buildRewardRows(reward: RewardRecord | undefined, unitPrices: UnitPrice[]): RewardRow[] {
  if (reward) {
    return withBlankRewardRows(reward.details.map((detail) => ({
      id: detail.id,
      section: detail.section,
      itemName: detail.itemName,
      unitPrice: detail.unitPrice,
      quantity: detail.quantity,
      unit: detail.unit,
      rate: detail.rate,
      amount: detail.amount,
    })));
  }
  return withBlankRewardRows([
    ...unitPrices.map((unitPrice) => ({
      section: unitPrice.section,
      itemName: unitPrice.itemName,
      unitPrice: unitPrice.unitPrice,
      quantity: 1,
      unit: unitPrice.unit,
      rate: 100,
    })),
  ]);
}

function withBlankRewardRows(rows: RewardRow[]) {
  return [
    ...rows,
    ...rewardSections.map((section) => ({
      section,
      itemName: '',
      unitPrice: 0,
      quantity: 1,
      unit: section === 'document' ? '通' : '件',
      rate: 100,
    })),
  ];
}

function rewardRowAmount(row: RewardRow) {
  return row.amount ?? calculateRewardDetailAmount(row);
}

function rewardSectionSubtotal(rows: RewardRow[], section: RewardSection) {
  return rows
    .filter((row) => row.section === section)
    .reduce((sum, row) => sum + (row.itemName.trim() ? rewardRowAmount(row) : 0), 0);
}

function userName(users: User[], userId?: string) {
  if (!userId) return '未設定';
  return users.find((user) => user.id === userId)?.name ?? '未設定';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function formatTimeRange(event: CalendarEvent) {
  if (event.startTime && event.endTime) return `${event.startTime}-${event.endTime}`;
  return event.startTime ?? event.endTime ?? '-';
}

function formatArea(value?: number) {
  return typeof value === 'number' ? value.toLocaleString('ja-JP', { maximumFractionDigits: 2 }) : '-';
}

function joinOwnerValues(owners: LandOwner[], key: 'name' | 'address' | 'share') {
  return owners.map((owner) => owner[key]).filter(Boolean).join(' / ') || '-';
}

function siteVisitLandSummary(lands: Land[], landIds: string[]) {
  return landIds
    .map((landId) => lands.find((land) => land.id === landId))
    .filter((land): land is Land => Boolean(land))
    .map((land) => landLabel(land))
    .join(' / ') || '-';
}

function landLabel(land: Land) {
  return `${land.address} ${land.chiban}${land.edaban ? `-${land.edaban}` : ''}`;
}

function currentDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}
