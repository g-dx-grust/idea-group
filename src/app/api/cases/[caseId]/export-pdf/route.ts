import { NextResponse } from 'next/server';
import { businessTypeLabels, statusLabels } from '@/lib/labels';
import { getCase, getStore } from '@/lib/store';
import type { CaseRecord, SurveyProgress } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ caseId: string }>;
}

export async function GET(request: Request, context: Context) {
  const { caseId } = await context.params;
  const [caseRow, store] = await Promise.all([getCase(caseId), getStore()]);
  if (!caseRow) return new NextResponse('Not found', { status: 404 });
  const type = new URL(request.url).searchParams.get('type') ?? 'jutakubo';
  const client = store.clients.find((item) => item.id === caseRow.clientId);
  const surveyor = store.users.find((item) => item.id === caseRow.surveyorUserId);

  const title = type === 'progress' ? '管理工程表' : '受託簿';
  const body = type === 'progress' ? progressBody(caseRow) : jutakuboBody(caseRow, {
    clientName: client?.name ?? '',
    surveyorName: surveyor?.name ?? '',
  });

  return new NextResponse(printShell(title, body), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function jutakuboBody(caseRow: CaseRecord, parties: { clientName: string; surveyorName: string }) {
  return `
    <h1>受託簿</h1>
    <dl>
      <dt>受託番号</dt><dd>${escapeHtml(caseRow.jutakuNo)}</dd>
      <dt>件名</dt><dd>${escapeHtml(caseRow.title)}</dd>
      <dt>所在</dt><dd>${escapeHtml(caseRow.address)}</dd>
      <dt>依頼先</dt><dd>${escapeHtml(parties.clientName)}</dd>
      <dt>担当者</dt><dd>${escapeHtml(parties.surveyorName)}</dd>
      <dt>業務区分</dt><dd>${escapeHtml(caseRow.businessTypes.map((type) => businessTypeLabels[type]).join('、'))}</dd>
      <dt>状態</dt><dd>${escapeHtml(statusLabels[caseRow.status])}</dd>
      <dt>期限</dt><dd>${escapeHtml(caseRow.deadline ?? '')}</dd>
      <dt>特記事項</dt><dd>${escapeHtml(caseRow.specialNote ?? '')}</dd>
    </dl>
    <h2>土地明細</h2>
    <table>
      <thead><tr><th>所在</th><th>地番</th><th>枝番</th><th>地目</th><th>地積(m²)</th><th>入力日</th><th>持分</th><th>氏名商号</th><th>住所</th></tr></thead>
      <tbody>
        ${caseRow.lands.map((land) => `
          <tr>
            <td>${escapeHtml(land.address)}</td>
            <td>${escapeHtml(land.chiban)}</td>
            <td>${escapeHtml(land.edaban ?? '')}</td>
            <td>${escapeHtml(land.chimoku ?? '')}</td>
            <td>${escapeHtml(land.chiseki ? String(land.chiseki) : '')}</td>
            <td>${escapeHtml(land.inputDate ?? '')}</td>
            <td>${escapeHtml(land.owners.map((owner) => owner.share).filter(Boolean).join('、'))}</td>
            <td>${escapeHtml(land.owners.map((owner) => owner.name).filter(Boolean).join('、'))}</td>
            <td>${escapeHtml(land.owners.map((owner) => owner.address).filter(Boolean).join('、'))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function progressBody(caseRow: CaseRecord) {
  return `
    <h1>管理工程表</h1>
    <dl>
      <dt>受託番号</dt><dd>${escapeHtml(caseRow.jutakuNo)}</dd>
      <dt>件名</dt><dd>${escapeHtml(caseRow.title)}</dd>
      <dt>所在</dt><dd>${escapeHtml(caseRow.address)}</dd>
      <dt>期限</dt><dd>${escapeHtml(caseRow.deadline ?? '')}</dd>
    </dl>
    ${surveyProgressTable('確定測量', caseRow.confirmedSurvey)}
    ${surveyProgressTable('分筆測量', caseRow.subdivisionSurvey)}
  `;
}

function surveyProgressTable(title: string, progress: SurveyProgress) {
  const rows = [
    ['受託日', progress.acceptedDate],
    ['予定 / 決定', progress.scheduleOrDecided === 'decided' ? '決定' : progress.scheduleOrDecided === 'scheduled' ? '予定' : ''],
    ['法務局調査日', progress.houmuInvestDate],
    ['役所調査日', progress.cityInvestDate],
    ['整理図閲覧', progress.hasSeirizuBrowse ? '有' : ''],
    ['整理図閲覧日', progress.seirizuBrowseDate],
    ['押印依頼日', progress.stampRequestDate],
    ['押印返却日', progress.stampReturnDate],
    ['隣地挨拶文送付日', progress.neighborSendDate],
    ['立会挨拶文送付日', progress.siteVisitSendDate],
    ['官立会申請日', progress.officialApplicationDate],
    ['官立会日', progress.officialMeetingDate],
    ['証明書申請日', progress.certRequestDate],
    ['証明書押印日', progress.certStampRequestDate],
    ['証明書提出日', progress.certSubmittedDate],
    ['証明書返却日', progress.certReturnDate],
    ['証明書回収日', progress.certCollectedDate],
    ['成果完了日', progress.completedDate],
  ] as const;

  return `
    <h2>${escapeHtml(title)}</h2>
    <table>
      <tbody>
        ${rows.map(([label, value]) => `
          <tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value ?? '')}</td></tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function printShell(title: string, body: string) {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #172033; margin: 24px; }
    button { margin-bottom: 16px; }
    h1 { font-size: 22px; margin: 0 0 16px; }
    h2 { font-size: 16px; margin-top: 24px; }
    dl { display: grid; grid-template-columns: 120px 1fr; border-top: 1px solid #d7dde6; }
    dt, dd { border-bottom: 1px solid #d7dde6; margin: 0; padding: 8px; }
    dt { background: #f1f5f9; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #d7dde6; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <button onclick="window.print()">印刷する</button>
  ${body}
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] ?? char);
}
