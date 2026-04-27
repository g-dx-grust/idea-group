import { NextRequest, NextResponse } from 'next/server';
import { businessTypeLabels, statusLabels } from '@/lib/labels';
import { getPrintableCases, isBusinessType, isCaseStatus } from '@/lib/store';
import type { CaseListFilters } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const filters = readFilters(request);
  const cases = await getPrintableCases(filters);
  const rows = cases
    .map((caseRow) => `
      <tr>
        <td>${escapeHtml(caseRow.jutakuNo)}</td>
        <td>${escapeHtml(caseRow.title)}</td>
        <td>${escapeHtml(caseRow.address)}</td>
        <td>${escapeHtml(caseRow.client?.name ?? '')}</td>
        <td>${escapeHtml(caseRow.businessTypes.map((type) => businessTypeLabels[type]).join('、'))}</td>
        <td>${escapeHtml(statusLabels[caseRow.status])}</td>
      </tr>
    `)
    .join('');

  return htmlResponse(`
    <h1>現場一覧</h1>
    <table>
      <thead>
        <tr>
          <th>受託番号</th>
          <th>件名</th>
          <th>所在</th>
          <th>依頼先</th>
          <th>業務区分</th>
          <th>状態</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}

function readFilters(request: NextRequest): CaseListFilters {
  const params = request.nextUrl.searchParams;
  const businessType = params.get('businessType');
  const status = params.get('status');
  const assignee = params.get('assignee');
  return {
    businessType: businessType && isBusinessType(businessType) ? businessType : 'all',
    status: status && isCaseStatus(status) ? status : 'all',
    assignee: ['designer', 'surveyor', 'registrar', 'unassigned'].includes(assignee ?? '') ? (assignee as CaseListFilters['assignee']) : 'all',
    q: params.get('q') ?? undefined,
  };
}

function htmlResponse(body: string) {
  return new NextResponse(printShell(body), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  });
}

function printShell(body: string) {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>現場一覧</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #172033; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 16px; }
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
