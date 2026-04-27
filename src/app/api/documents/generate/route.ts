import { NextRequest, NextResponse } from 'next/server';
import { rewardSectionLabels } from '@/lib/labels';
import { formatCurrency } from '@/lib/rewards';
import { getCase } from '@/lib/store';
import { toWareki } from '@/lib/wareki';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get('caseId');
  const rewardId = request.nextUrl.searchParams.get('rewardId');
  const docType = request.nextUrl.searchParams.get('docType') ?? 'estimate';
  if (!caseId || !rewardId) return new NextResponse('Bad request', { status: 400 });

  const caseRow = await getCase(caseId);
  const reward = caseRow?.rewards.find((item) => item.id === rewardId);
  if (!caseRow || !reward) return new NextResponse('Not found', { status: 404 });

  const title = docType === 'invoice' ? '御請求書' : docType === 'reward_calc' ? '報酬額計算書' : '御見積書';
  const issuedDate = docType === 'invoice' ? reward.invoiceDate : docType === 'estimate' ? reward.estimateDate : undefined;
  const leadText = docType === 'invoice'
    ? '下記業務につき、ご請求申し上げます。'
    : docType === 'reward_calc'
      ? '下記業務の報酬額計算書です。'
      : '下記業務につき、お見積申し上げます。';
  const summaryRows = [
    ['合計報酬額', reward.totalReward],
    ['調整額', reward.adjustAmount],
    ['差引報酬額', reward.netReward],
    ['諸経費', reward.miscExpense],
    ['消費税', reward.taxAmount],
    ['立替金', reward.stampCost],
    ['総合計', reward.total],
  ] as const;

  return new NextResponse(printShell(title, `
    <div class="issued">${escapeHtml(toWareki(issuedDate ? new Date(issuedDate) : new Date()))}</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="recipient">${escapeHtml(reward.recipientName)} 様</div>
    <p>${escapeHtml(leadText)}</p>
    <dl>
      <dt>業務名</dt><dd>${escapeHtml(reward.businessName)}</dd>
      <dt>所在</dt><dd>${escapeHtml(reward.address)}</dd>
      <dt>受託番号</dt><dd>${escapeHtml(caseRow.jutakuNo)}</dd>
    </dl>
    <table>
      <thead><tr><th>区分</th><th>品目</th><th>数量</th><th>単位</th><th>単価</th><th>加減率</th><th>金額</th></tr></thead>
      <tbody>
        ${reward.details.map((detail) => `
          <tr>
            <td>${escapeHtml(rewardSectionLabels[detail.section])}</td>
            <td>${escapeHtml(detail.itemName)}</td>
            <td>${detail.quantity}</td>
            <td>${escapeHtml(detail.unit)}</td>
            <td>${escapeHtml(formatCurrency(detail.unitPrice))}</td>
            <td>${detail.rate}%</td>
            <td>${escapeHtml(formatCurrency(detail.amount))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <table class="summary">
      <tbody>
        ${summaryRows.map(([label, value]) => `
          <tr><th>${escapeHtml(label)}</th><td>${escapeHtml(formatCurrency(value))}</td></tr>
        `).join('')}
      </tbody>
    </table>
    <div class="issuer">
      土地家屋調査士法人 イデアグループ<br />
      名古屋市北区芦辺町三丁目五番地6<br />
      登録番号 T9180005006198
    </div>
  `), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
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
    h1 { text-align: center; font-size: 24px; letter-spacing: 0; }
    .issued { text-align: right; }
    .recipient { font-size: 18px; border-bottom: 1px solid #172033; display: inline-block; min-width: 280px; margin: 16px 0; }
    dl { display: grid; grid-template-columns: 120px 1fr; margin: 16px 0; }
    dt, dd { border: 1px solid #d7dde6; margin: 0; padding: 8px; }
    dt { background: #f1f5f9; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
    th, td { border: 1px solid #d7dde6; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; }
    .summary { margin-left: auto; width: 360px; }
    .summary td { text-align: right; }
    .issuer { margin-top: 32px; text-align: right; }
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
