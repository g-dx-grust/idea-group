import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, FileText } from 'lucide-react';
import { BusinessBadges } from '@/components/cases/BusinessBadges';
import { StatusBadge } from '@/components/cases/StatusBadge';
import { getDashboard, getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [dashboard, store] = await Promise.all([getDashboard(), getStore()]);

  return (
    <div className="content space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="page-title">ダッシュボード</h1>
          <p className="muted mt-[var(--space-xs)]">現場、請求、入金、期限の状況を確認します。</p>
        </div>
        <Link href="/cases/new" className="button button-primary">
          現場を作成する
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="進行中" value={`${dashboard.metrics.inProgress}件`} icon={<Clock className="h-5 w-5" />} />
        <MetricCard label="未請求" value={`${dashboard.metrics.unbilled}件`} icon={<FileText className="h-5 w-5" />} />
        <MetricCard label="未入金" value={`${dashboard.metrics.unpaid}件`} icon={<AlertTriangle className="h-5 w-5" />} />
        <MetricCard label="今月受託" value={`${dashboard.metrics.thisMonthCreated}件`} icon={<CheckCircle2 className="h-5 w-5" />} />
      </section>

      <TutorialCard />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="panel">
          <div className="border-b border-[var(--color-border)] p-6">
            <h2 className="section-title">期限切れ/期限間近</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>受託番号</th>
                  <th>件名</th>
                  <th>期限</th>
                  <th>状態</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.deadlines.map((caseRow) => (
                  <tr key={caseRow.id}>
                    <td className="mono font-semibold">
                      <Link href={`/cases/${caseRow.id}`} className="link-muted">
                        {caseRow.jutakuNo}
                      </Link>
                    </td>
                    <td>
                      <div className="strong-text line-clamp-2">{caseRow.title}</div>
                      <div className="muted text-[length:var(--font-s)]">{caseRow.address}</div>
                    </td>
                    <td className="mono">{formatDate(caseRow.deadline)}</td>
                    <td>
                      <StatusBadge status={caseRow.status} />
                    </td>
                  </tr>
                ))}
                {dashboard.deadlines.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted text-center">
                      期限が近い現場はありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="section-title mb-4">担当者別 進行中件数</h2>
          <div className="grid gap-[var(--space-s)]">
            {dashboard.bySurveyor.map((row) => (
              <div key={row.user.id} className="grid gap-[var(--space-xs)]">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{row.user.name}</span>
                  <span className="mono">{row.count}件</span>
                </div>
                <div className="h-2 rounded-[var(--radius-full)] bg-[var(--color-head)]">
                  <div
                    className="h-2 rounded-[var(--radius-full)] bg-[var(--color-text-grey)]"
                    style={{ width: `${Math.min(100, row.count * 20)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="border-b border-[var(--color-border)] p-6">
          <h2 className="section-title">最近更新した現場</h2>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>受託番号</th>
                <th>件名</th>
                <th>依頼先</th>
                <th>業務区分</th>
                <th>更新日</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentCases.map((caseRow) => {
                const client = store.clients.find((item) => item.id === caseRow.clientId);
                return (
                  <tr key={caseRow.id}>
                    <td className="mono font-semibold">
                      <Link href={`/cases/${caseRow.id}`} className="link-muted">
                        {caseRow.jutakuNo}
                      </Link>
                    </td>
                    <td className="line-clamp-2">{caseRow.title}</td>
                    <td>{client?.name ?? '未設定'}</td>
                    <td>
                      <BusinessBadges types={caseRow.businessTypes} limit={3} />
                    </td>
                    <td className="mono">{formatDate(caseRow.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="panel p-6">
      <div className="mb-3 flex items-center justify-between text-[var(--color-text-grey)]">{icon}</div>
      <div className="field-label">{label}</div>
      <div className="mono mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function TutorialCard() {
  const steps = [
    ['1', '現場を作成', '受託番号、依頼先、担当者、業務区分を登録します。'],
    ['2', '土地・立会を追加', '詳細画面で土地明細と立会申請を紐づけます。'],
    ['3', '報酬を計算', '明細と税処理を保存し、見積・請求の基礎にします。'],
    ['4', '帳票を確認', 'HTML印刷ビューで受託簿や見積書を確認します。'],
  ];

  return (
    <section className="panel p-6">
      <div className="mb-4">
        <h2 className="section-title">はじめに</h2>
        <p className="muted mt-1 text-sm">MVPで確認できる基本操作です。</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {steps.map(([number, title, description]) => (
          <div key={number} className="rounded-[var(--radius-m)] border border-[var(--color-border)] p-4">
            <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-mid)]">
              {number}
            </div>
            <div className="font-semibold">{title}</div>
            <p className="muted mt-1 text-sm leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
