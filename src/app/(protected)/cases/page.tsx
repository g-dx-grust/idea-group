import Link from 'next/link';
import { Download, Plus, Search, X } from 'lucide-react';
import { BusinessBadges } from '@/components/cases/BusinessBadges';
import { StatusBadge } from '@/components/cases/StatusBadge';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { deleteCaseAction } from '@/lib/actions';
import { businessTypeLabels, statusLabels } from '@/lib/labels';
import { getStore, isBusinessType, isCaseStatus, listCases } from '@/lib/store';
import { businessTypes, caseStatuses, type CaseListFilters } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CasesPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = normalizeFilters(params ?? {});
  const [cases, store] = await Promise.all([listCases(filters), getStore()]);
  const exportHref = buildExportHref(filters);

  return (
    <div className="content space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="page-title">現場一覧</h1>
          <p className="muted mt-[var(--space-xs)]">受託番号、件名、所在、依頼先で横断検索できます。</p>
        </div>
        <div className="flex flex-wrap gap-[var(--space-s)]">
          <Link href={exportHref} target="_blank" className="button button-secondary">
            <Download className="h-4 w-4" />
            一覧を出力する
          </Link>
          <Link href="/cases/new" className="button button-primary">
            <Plus className="h-4 w-4" />
            現場を作成する
          </Link>
        </div>
      </div>

      <form className="panel grid gap-4 p-6 lg:grid-cols-[1fr_1fr_1fr_2fr_auto_auto] lg:items-end">
        <label className="grid gap-2">
          <span className="field-label">業務区分</span>
          <select name="businessType" defaultValue={filters.businessType ?? 'all'} className="control">
            <option value="all">全て</option>
            {businessTypes.map((type) => (
              <option key={type} value={type}>
                {businessTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="field-label">ステータス</span>
          <select name="status" defaultValue={filters.status ?? 'all'} className="control">
            <option value="all">全て</option>
            {caseStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="field-label">担当</span>
          <select name="assignee" defaultValue={filters.assignee ?? 'all'} className="control">
            <option value="all">全て</option>
            <option value="designer">設計担当あり</option>
            <option value="surveyor">測量担当あり</option>
            <option value="registrar">登記担当あり</option>
            <option value="unassigned">担当未設定</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="field-label">検索</span>
          <input name="q" defaultValue={filters.q ?? ''} className="control" placeholder="26-0185、名古屋市、筆界" />
        </label>
        <button className="button button-primary" type="submit">
          <Search className="h-4 w-4" />
          検索する
        </button>
        <Link href="/cases" className="button button-secondary">
          <X className="h-4 w-4" />
          解除する
        </Link>
      </form>

      <div className="font-medium text-[var(--color-text-mid)]">
        <span className="mono">{cases.length}</span>件
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>受託番号</th>
                <th>件名</th>
                <th>所在</th>
                <th>依頼先</th>
                <th>担当</th>
                <th>業務区分</th>
                <th>状態</th>
                <th>更新日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseRow) => {
                const client = store.clients.find((item) => item.id === caseRow.clientId);
                const assignees = [
                  store.users.find((user) => user.id === caseRow.designerUserId)?.name,
                  store.users.find((user) => user.id === caseRow.surveyorUserId)?.name,
                  store.users.find((user) => user.id === caseRow.registrarUserId)?.name,
                ].filter(Boolean);
                return (
                  <tr key={caseRow.id}>
                    <td className="mono font-semibold">
                      <Link href={`/cases/${caseRow.id}`} className="link-muted">
                        {caseRow.jutakuNo}
                      </Link>
                      {caseRow.cadNo && <div className="muted text-[length:var(--font-xs)]">CAD:{caseRow.cadNo}</div>}
                    </td>
                    <td className="strong-text line-clamp-2">{caseRow.title}</td>
                    <td className="muted">{caseRow.address}</td>
                    <td>{client?.name ?? '未設定'}</td>
                    <td className="muted">{assignees.join(' / ') || '未設定'}</td>
                    <td>
                      <BusinessBadges types={caseRow.businessTypes} limit={3} />
                    </td>
                    <td>
                      <StatusBadge status={caseRow.status} />
                    </td>
                    <td className="mono">{formatDate(caseRow.updatedAt)}</td>
                    <td>
                      <DeleteButton
                        action={deleteCaseAction.bind(null, caseRow.id)}
                        confirmMessage={`現場 ${caseRow.jutakuNo} を削除します。土地・立会申請・報酬書・予定もすべて削除されます。よろしいですか？`}
                        label="削除する"
                      />
                    </td>
                  </tr>
                );
              })}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted text-center">
                    条件に一致する現場はありません。
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

function normalizeFilters(params: Record<string, string | string[] | undefined>): CaseListFilters {
  const businessType = one(params.businessType);
  const status = one(params.status);
  const assignee = one(params.assignee);
  const q = one(params.q);

  return {
    businessType: businessType && isBusinessType(businessType) ? businessType : 'all',
    status: status && isCaseStatus(status) ? status : 'all',
    assignee: ['designer', 'surveyor', 'registrar', 'unassigned'].includes(assignee ?? '') ? (assignee as CaseListFilters['assignee']) : 'all',
    q,
  };
}

function buildExportHref(filters: CaseListFilters) {
  const params = new URLSearchParams();
  if (filters.businessType && filters.businessType !== 'all') params.set('businessType', filters.businessType);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.assignee && filters.assignee !== 'all') params.set('assignee', filters.assignee);
  if (filters.q) params.set('q', filters.q);
  const query = params.toString();
  return query ? `/api/cases/export-pdf?${query}` : '/api/cases/export-pdf';
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { month: '2-digit', day: '2-digit' }).format(new Date(value));
}
