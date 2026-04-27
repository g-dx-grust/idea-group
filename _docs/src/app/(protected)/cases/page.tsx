import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import {
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    FileDown,
    Plus,
    RotateCcw,
    Search,
} from 'lucide-react';
import {
    and,
    asc,
    desc,
    eq,
    ilike,
    isNotNull,
    isNull,
    or,
    sql,
    type SQL,
} from 'drizzle-orm';
import { db } from '@idea/database';
import { ideaCases, ideaClients } from '@idea/database/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge';

type SearchParams = Record<string, string | string[] | undefined>;

interface Props {
    searchParams?: SearchParams | Promise<SearchParams>;
}

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
    { value: 'draft', label: '下書き' },
    { value: 'in_progress', label: '進行中' },
    { value: 'done', label: '成果完了' },
    { value: 'invoiced', label: '請求済' },
    { value: 'paid', label: '入金済' },
    { value: 'closed', label: '終了' },
] as const;

const BUSINESS_TYPE_OPTIONS = [
    { value: 'design', label: '設計', column: ideaCases.hasDesign },
    { value: 'land_estimate', label: '土地見積', column: ideaCases.hasLandEstimate },
    { value: 'provisional_survey', label: '仮測量', column: ideaCases.hasProvisionalSurvey },
    { value: 'confirmed_survey', label: '確定測量', column: ideaCases.hasConfirmedSurvey },
    { value: 'subdivision_survey', label: '分筆測量', column: ideaCases.hasSubdivisionSurvey },
    { value: 'other_survey', label: 'その他測量', column: ideaCases.hasOtherSurvey },
    { value: 'consult_survey', label: 'コンサル測量', column: ideaCases.hasConsultSurvey },
    { value: 'land_reg', label: '土地登記', column: ideaCases.hasLandReg },
    { value: 'building_reg', label: '建物登記', column: ideaCases.hasBuildingReg },
    { value: 'farmland_conversion', label: '農地転用', column: ideaCases.hasFarmlandConversion },
    { value: 'donation_revert', label: '寄付帰属', column: ideaCases.hasDonationRevert },
] as const;

const ASSIGNEE_OPTIONS = [
    { value: 'designer', label: '設計担当' },
    { value: 'surveyor', label: '測量担当' },
    { value: 'registrar', label: '登記担当' },
    { value: 'unassigned', label: '担当未設定' },
] as const;

const SORT_KEYS = ['jutakuNo', 'status', 'updatedAt'] as const;
const SORT_DIRECTIONS = ['asc', 'desc'] as const;
const CONTROL_HEIGHT_M = 'h-[calc(var(--space-xl)_+_var(--space-s))]';
const CONTROL_HEIGHT_S = 'h-[var(--space-xl)]';
const FOCUS_RING_CLASS = 'focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[var(--shadow-focus)]';
const SELECT_CLASS_NAME = `${CONTROL_HEIGHT_M} rounded-[var(--radius-s)] border border-[var(--color-border)] bg-[var(--color-white)] px-[var(--space-s)] text-[length:var(--font-m)] leading-[var(--leading-tight)] text-[var(--color-text-black)] shadow-[var(--shadow-s)] outline-none ${FOCUS_RING_CLASS}`;
const PRIMARY_BUTTON_CLASS = `${CONTROL_HEIGHT_S} rounded-[var(--radius-m)] bg-[var(--color-main)] px-[var(--space-m)] text-[length:var(--font-m)] font-bold leading-[var(--leading-tight)] text-[var(--color-text-white)] shadow-[var(--shadow-s)] hover:bg-[var(--color-main-darken)] ${FOCUS_RING_CLASS}`;
const SECONDARY_BUTTON_CLASS = `${CONTROL_HEIGHT_S} rounded-[var(--radius-m)] border border-[var(--color-border)] bg-[var(--color-white)] px-[var(--space-m)] text-[length:var(--font-m)] font-bold leading-[var(--leading-tight)] text-[var(--color-main)] shadow-[var(--shadow-s)] hover:bg-[var(--color-column)] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING_CLASS}`;
const FORM_BUTTON_CLASS = `${CONTROL_HEIGHT_M} rounded-[var(--radius-m)] px-[var(--space-m)] text-[length:var(--font-m)] font-bold leading-[var(--leading-tight)] shadow-[var(--shadow-s)] ${FOCUS_RING_CLASS}`;
const LINK_FOCUS_CLASS = `rounded-[var(--radius-s)] ${FOCUS_RING_CLASS}`;

type BusinessType = (typeof BUSINESS_TYPE_OPTIONS)[number]['value'] | 'all';
type AssigneeFilter = (typeof ASSIGNEE_OPTIONS)[number]['value'] | 'all';
type SortKey = (typeof SORT_KEYS)[number];
type SortDirection = (typeof SORT_DIRECTIONS)[number];

interface NormalizedFilters {
    businessType: BusinessType;
    status: string;
    assignee: AssigneeFilter;
    q: string;
    page: number;
    sort: SortKey;
    direction: SortDirection;
}

interface CaseListRow {
    id: string;
    jutakuNo: string;
    cadNo: string | null;
    title: string;
    address: string;
    status: string;
    clientName: string | null;
    designerUserId: string | null;
    surveyorUserId: string | null;
    registrarUserId: string | null;
    hasDesign: boolean;
    hasLandEstimate: boolean;
    hasProvisionalSurvey: boolean;
    hasConfirmedSurvey: boolean;
    hasSubdivisionSurvey: boolean;
    hasOtherSurvey: boolean;
    hasConsultSurvey: boolean;
    hasLandReg: boolean;
    hasBuildingReg: boolean;
    hasFarmlandConversion: boolean;
    hasDonationRevert: boolean;
    updatedAt: Date;
}

export default async function CasesPage({ searchParams }: Props) {
    const params = await Promise.resolve(searchParams ?? {});
    const filters = normalizeFilters(params);
    const where = buildWhere(filters);
    const offset = (filters.page - 1) * PAGE_SIZE;
    const orderBy = getOrderBy(filters);

    const [cases, countRows] = await Promise.all([
        db
            .select({
                id: ideaCases.id,
                jutakuNo: ideaCases.jutakuNo,
                cadNo: ideaCases.cadNo,
                title: ideaCases.title,
                address: ideaCases.address,
                status: ideaCases.status,
                clientName: ideaClients.name,
                designerUserId: ideaCases.designerUserId,
                surveyorUserId: ideaCases.surveyorUserId,
                registrarUserId: ideaCases.registrarUserId,
                hasDesign: ideaCases.hasDesign,
                hasLandEstimate: ideaCases.hasLandEstimate,
                hasProvisionalSurvey: ideaCases.hasProvisionalSurvey,
                hasConfirmedSurvey: ideaCases.hasConfirmedSurvey,
                hasSubdivisionSurvey: ideaCases.hasSubdivisionSurvey,
                hasOtherSurvey: ideaCases.hasOtherSurvey,
                hasConsultSurvey: ideaCases.hasConsultSurvey,
                hasLandReg: ideaCases.hasLandReg,
                hasBuildingReg: ideaCases.hasBuildingReg,
                hasFarmlandConversion: ideaCases.hasFarmlandConversion,
                hasDonationRevert: ideaCases.hasDonationRevert,
                updatedAt: ideaCases.updatedAt,
            })
            .from(ideaCases)
            .leftJoin(ideaClients, eq(ideaCases.clientId, ideaClients.id))
            .where(where)
            .orderBy(orderBy)
            .limit(PAGE_SIZE)
            .offset(offset),
        db
            .select({ total: sql<number>`count(*)`.mapWith(Number) })
            .from(ideaCases)
            .leftJoin(ideaClients, eq(ideaCases.clientId, ideaClients.id))
            .where(where),
    ]);

    const total = countRows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (total > 0 && filters.page > totalPages) {
        redirect(buildCasesHref(filters, { page: totalPages }));
    }

    const from = total === 0 ? 0 : offset + 1;
    const to = Math.min(offset + cases.length, total);
    const exportHref = buildExportHref(filters);

    return (
        <div className="min-h-screen bg-[var(--color-background)] text-[length:var(--font-m)] text-[var(--color-text-black)]">
            <header className="border-b border-[var(--color-border)] bg-[var(--color-white)] px-[var(--space-m)] py-[var(--space-m)] md:px-[var(--space-l)]">
                <div className="mx-auto flex max-w-[var(--width-content-max)] flex-col gap-[var(--space-m)] md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-[length:var(--font-xl)] font-bold leading-[var(--leading-tight)]">現場一覧</h1>
                    </div>
                    <div className="flex flex-wrap gap-[var(--space-s)]">
                        <Button variant="outline" size="sm" className={SECONDARY_BUTTON_CLASS} asChild>
                            <Link href={exportHref} target="_blank">
                                <FileDown className="mr-[var(--space-xs)] h-[var(--space-m)] w-[var(--space-m)]" />
                                PDFを出力する
                            </Link>
                        </Button>
                        <Button size="sm" className={PRIMARY_BUTTON_CLASS} asChild>
                            <Link href="/cases/new">
                                <Plus className="mr-[var(--space-xs)] h-[var(--space-m)] w-[var(--space-m)]" />
                                現場を作成する
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            <form
                action="/cases"
                className="border-b border-[var(--color-border)] bg-[var(--color-white)] px-[var(--space-m)] py-[var(--space-m)] md:px-[var(--space-l)]"
            >
                <div className="mx-auto grid max-w-[var(--width-content-max)] gap-[var(--space-m)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_auto_auto] lg:items-end">
                    <label className="grid gap-[var(--space-xs)]">
                        <span className="text-[length:var(--font-m)] font-bold text-[var(--color-text-black)]">業務区分</span>
                        <select
                            name="businessType"
                            defaultValue={filters.businessType}
                            className={SELECT_CLASS_NAME}
                        >
                            <option value="all">全て</option>
                            {BUSINESS_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-[var(--space-xs)]">
                        <span className="text-[length:var(--font-m)] font-bold text-[var(--color-text-black)]">ステータス</span>
                        <select
                            name="status"
                            defaultValue={filters.status}
                            className={SELECT_CLASS_NAME}
                        >
                            <option value="all">全て</option>
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-[var(--space-xs)]">
                        <span className="text-[length:var(--font-m)] font-bold text-[var(--color-text-black)]">担当</span>
                        <select
                            name="assignee"
                            defaultValue={filters.assignee}
                            className={SELECT_CLASS_NAME}
                        >
                            <option value="all">全て</option>
                            {ASSIGNEE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-[var(--space-xs)]">
                        <span className="text-[length:var(--font-m)] font-bold text-[var(--color-text-black)]">受託番号/件名/所在/依頼先</span>
                        <Input
                            name="q"
                            defaultValue={filters.q}
                            placeholder="例:26-0185、名古屋市、筆界"
                            className={`${CONTROL_HEIGHT_M} rounded-[var(--radius-s)] border-[var(--color-border)] bg-[var(--color-white)] px-[var(--space-s)] text-[length:var(--font-m)] text-[var(--color-text-black)] shadow-[var(--shadow-s)] placeholder:text-[var(--color-text-disabled)] ${FOCUS_RING_CLASS}`}
                        />
                    </label>

                    <input type="hidden" name="sort" value={filters.sort} />
                    <input type="hidden" name="direction" value={filters.direction} />

                    <Button type="submit" size="sm" className={`${FORM_BUTTON_CLASS} bg-[var(--color-main)] text-[var(--color-text-white)] hover:bg-[var(--color-main-darken)]`}>
                        <Search className="mr-[var(--space-xs)] h-[var(--space-m)] w-[var(--space-m)]" />
                        検索する
                    </Button>

                    <Button type="button" variant="outline" size="sm" className={`${FORM_BUTTON_CLASS} border border-[var(--color-border)] bg-[var(--color-white)] text-[var(--color-main)] hover:bg-[var(--color-column)]`} asChild>
                        <Link href="/cases">
                            <RotateCcw className="mr-[var(--space-xs)] h-[var(--space-m)] w-[var(--space-m)]" />
                            条件を解除する
                        </Link>
                    </Button>
                </div>
            </form>

            <main className="mx-auto max-w-[var(--width-content-max)] px-[var(--space-m)] py-[var(--space-l)] md:px-[var(--space-l)]">
                <div className="mb-[var(--space-m)] flex flex-col gap-[var(--space-s)] text-[length:var(--font-m)] text-[var(--color-text-grey)] md:flex-row md:items-center md:justify-between">
                    <div>
                        <span className="font-mono text-[var(--color-text-black)]">{from}-{to}</span>
                        <span className="mx-[var(--space-xs)]">/</span>
                        <span className="font-mono text-[var(--color-text-black)]">{total}</span>
                        <span className="ml-[var(--space-xs)]">件</span>
                    </div>
                    <div className="flex items-center gap-[var(--space-s)]">
                        {filters.page > 1 ? (
                            <Button variant="outline" size="sm" className={SECONDARY_BUTTON_CLASS} asChild>
                                <Link href={buildCasesHref(filters, { page: filters.page - 1 })}>
                                    <ChevronLeft className="mr-[var(--space-xs)] h-[var(--space-m)] w-[var(--space-m)]" />
                                    前へ移動する
                                </Link>
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" className={SECONDARY_BUTTON_CLASS} disabled>
                                <ChevronLeft className="mr-[var(--space-xs)] h-[var(--space-m)] w-[var(--space-m)]" />
                                前へ移動する
                            </Button>
                        )}
                        <span className="min-w-[var(--space-xxl)] text-center font-mono text-[length:var(--font-xs)] text-[var(--color-text-grey)]">
                            {filters.page}/{totalPages}
                        </span>
                        {filters.page < totalPages ? (
                            <Button variant="outline" size="sm" className={SECONDARY_BUTTON_CLASS} asChild>
                                <Link href={buildCasesHref(filters, { page: filters.page + 1 })}>
                                    次へ移動する
                                    <ChevronRight className="ml-[var(--space-xs)] h-[var(--space-m)] w-[var(--space-m)]" />
                                </Link>
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" className={SECONDARY_BUTTON_CLASS} disabled>
                                次へ移動する
                                <ChevronRight className="ml-[var(--space-xs)] h-[var(--space-m)] w-[var(--space-m)]" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="overflow-hidden rounded-[var(--radius-l)] border border-[var(--color-border)] bg-[var(--color-white)] shadow-[var(--shadow-s)]">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[var(--width-content-max)] border-collapse text-[length:var(--font-s)]">
                            <thead className="bg-[var(--color-head)] text-[length:var(--font-xs)] text-[var(--color-text-grey)]">
                                <tr className="border-b border-[var(--color-border)]">
                                    <SortableHeader filters={filters} sort="jutakuNo">
                                        受託番号
                                    </SortableHeader>
                                    <th className="px-[var(--space-m)] py-[var(--space-s)] text-left font-bold">件名</th>
                                    <th className="px-[var(--space-m)] py-[var(--space-s)] text-left font-bold">所在</th>
                                    <th className="px-[var(--space-m)] py-[var(--space-s)] text-left font-bold">依頼先</th>
                                    <th className="px-[var(--space-m)] py-[var(--space-s)] text-left font-bold">担当</th>
                                    <th className="px-[var(--space-m)] py-[var(--space-s)] text-left font-bold">業務区分</th>
                                    <SortableHeader filters={filters} sort="status">
                                        ステータス
                                    </SortableHeader>
                                    <SortableHeader filters={filters} sort="updatedAt">
                                        更新日
                                    </SortableHeader>
                                </tr>
                            </thead>
                            <tbody>
                                {cases.length > 0 ? (
                                    cases.map((caseRow) => (
                                        <CaseTableRow key={caseRow.id} caseRow={caseRow} />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-[var(--space-m)] py-[var(--space-xxl)] text-center">
                                            <div className="text-[length:var(--font-m)] font-bold text-[var(--color-text-black)]">該当する現場はありません</div>
                                            <div className="mt-[var(--space-xs)] text-[length:var(--font-m)] text-[var(--color-text-grey)]">条件を変更して再検索してください。</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

function CaseTableRow({ caseRow }: { caseRow: CaseListRow }) {
    const businessTypes = getBusinessTypeLabels(caseRow);
    const visibleTypes = businessTypes.slice(0, 3);
    const hiddenTypeCount = businessTypes.length - visibleTypes.length;

    return (
        <tr className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-column)]">
            <td className="whitespace-nowrap px-[var(--space-m)] py-[var(--space-s)] align-top">
                <Link href={`/cases/${caseRow.id}`} className={`font-mono font-bold text-[var(--color-text-link)] underline-offset-[var(--space-xs)] hover:underline ${LINK_FOCUS_CLASS}`}>
                    {caseRow.jutakuNo}
                </Link>
                {caseRow.cadNo && (
                    <div className="mt-[var(--space-xs)] font-mono text-[length:var(--font-xs)] text-[var(--color-text-grey)]">CAD:{caseRow.cadNo}</div>
                )}
            </td>
            <td className="px-[var(--space-m)] py-[var(--space-s)] align-top">
                <Link href={`/cases/${caseRow.id}`} className={`font-bold text-[var(--color-text-black)] underline-offset-[var(--space-xs)] hover:text-[var(--color-text-link)] hover:underline ${LINK_FOCUS_CLASS}`}>
                    {caseRow.title}
                </Link>
            </td>
            <td className="px-[var(--space-m)] py-[var(--space-s)] align-top text-[var(--color-text-grey)]">
                <span className="line-clamp-2">{caseRow.address}</span>
            </td>
            <td className="px-[var(--space-m)] py-[var(--space-s)] align-top text-[var(--color-text-grey)]">
                {caseRow.clientName ?? <span className="text-[var(--color-text-disabled)]">未設定</span>}
            </td>
            <td className="px-[var(--space-m)] py-[var(--space-s)] align-top text-[var(--color-text-grey)]">
                {getAssigneeLabels(caseRow).join('/') || <span className="text-[var(--color-text-disabled)]">未設定</span>}
            </td>
            <td className="px-[var(--space-m)] py-[var(--space-s)] align-top">
                <div className="flex flex-wrap gap-[var(--space-xs)]">
                    {visibleTypes.map((label) => (
                        <Badge key={label} variant="outline" className="rounded-[var(--radius-full)] border-[var(--color-border)] bg-[var(--color-white)] px-[var(--space-s)] text-[length:var(--font-xxs)] font-bold text-[var(--color-text-grey)]">
                            {label}
                        </Badge>
                    ))}
                    {hiddenTypeCount > 0 && (
                        <Badge variant="outline" className="rounded-[var(--radius-full)] border-[var(--color-border)] bg-[var(--color-column)] px-[var(--space-s)] text-[length:var(--font-xxs)] font-bold text-[var(--color-text-grey)]">
                            +{hiddenTypeCount}
                        </Badge>
                    )}
                </div>
            </td>
            <td className="whitespace-nowrap px-[var(--space-m)] py-[var(--space-s)] align-top">
                <CaseStatusBadge status={caseRow.status} />
            </td>
            <td className="whitespace-nowrap px-[var(--space-m)] py-[var(--space-s)] align-top font-mono text-[length:var(--font-xs)] text-[var(--color-text-grey)]">
                {formatDate(caseRow.updatedAt)}
            </td>
        </tr>
    );
}

function SortableHeader({
    filters,
    sort,
    children,
}: {
    filters: NormalizedFilters;
    sort: SortKey;
    children: ReactNode;
}) {
    const isActive = filters.sort === sort;
    const nextDirection: SortDirection = isActive && filters.direction === 'asc' ? 'desc' : 'asc';

    return (
        <th className="whitespace-nowrap px-[var(--space-m)] py-[var(--space-s)] text-left font-bold">
            <Link
                href={buildCasesHref(filters, { sort, direction: nextDirection, page: 1 })}
                className={`inline-flex items-center gap-[var(--space-xs)] text-[var(--color-text-grey)] underline-offset-[var(--space-xs)] hover:text-[var(--color-text-link)] hover:underline ${LINK_FOCUS_CLASS}`}
            >
                {children}
                <ArrowUpDown className={isActive ? 'h-[var(--space-m)] w-[var(--space-m)] text-[var(--color-main)]' : 'h-[var(--space-m)] w-[var(--space-m)]'} />
            </Link>
        </th>
    );
}

function normalizeFilters(params: SearchParams): NormalizedFilters {
    const businessType = getValidValue(
        getSingleValue(params.businessType),
        ['all', ...BUSINESS_TYPE_OPTIONS.map((option) => option.value)],
        'all',
    ) as BusinessType;
    const status = getValidValue(
        getSingleValue(params.status),
        ['all', ...STATUS_OPTIONS.map((option) => option.value)],
        'all',
    );
    const assignee = getValidValue(
        getSingleValue(params.assignee),
        ['all', ...ASSIGNEE_OPTIONS.map((option) => option.value)],
        'all',
    ) as AssigneeFilter;
    const sort = getValidValue(getSingleValue(params.sort), SORT_KEYS, 'updatedAt') as SortKey;
    const direction = getValidValue(getSingleValue(params.direction), SORT_DIRECTIONS, 'desc') as SortDirection;
    const q = (getSingleValue(params.q) ?? '').trim();
    const page = Math.max(1, Number.parseInt(getSingleValue(params.page) ?? '1', 10) || 1);

    return { businessType, status, assignee, q, page, sort, direction };
}

function buildWhere(filters: NormalizedFilters) {
    const conditions: SQL[] = [isNull(ideaCases.deletedAt)];

    if (filters.businessType !== 'all') {
        const businessType = BUSINESS_TYPE_OPTIONS.find((option) => option.value === filters.businessType);
        if (businessType) {
            conditions.push(eq(businessType.column, true));
        }
    }

    if (filters.status !== 'all') {
        conditions.push(eq(ideaCases.status, filters.status));
    }

    switch (filters.assignee) {
        case 'designer':
            conditions.push(isNotNull(ideaCases.designerUserId));
            break;
        case 'surveyor':
            conditions.push(isNotNull(ideaCases.surveyorUserId));
            break;
        case 'registrar':
            conditions.push(isNotNull(ideaCases.registrarUserId));
            break;
        case 'unassigned':
            conditions.push(
                and(
                    isNull(ideaCases.designerUserId),
                    isNull(ideaCases.surveyorUserId),
                    isNull(ideaCases.registrarUserId),
                )!,
            );
            break;
    }

    if (filters.q) {
        const keyword = `%${escapeLike(filters.q)}%`;
        conditions.push(
            or(
                ilike(ideaCases.jutakuNo, keyword),
                ilike(ideaCases.title, keyword),
                ilike(ideaCases.address, keyword),
                ilike(ideaClients.name, keyword),
            )!,
        );
    }

    return and(...conditions)!;
}

function getOrderBy(filters: NormalizedFilters) {
    const column =
        filters.sort === 'jutakuNo'
            ? ideaCases.jutakuNo
            : filters.sort === 'status'
              ? ideaCases.status
              : ideaCases.updatedAt;

    return filters.direction === 'asc' ? asc(column) : desc(column);
}

function buildCasesHref(filters: NormalizedFilters, overrides: Partial<Record<keyof NormalizedFilters, string | number>>) {
    const next = { ...filters, ...overrides };
    const params = new URLSearchParams();

    setQueryParam(params, 'businessType', next.businessType, 'all');
    setQueryParam(params, 'status', next.status, 'all');
    setQueryParam(params, 'assignee', next.assignee, 'all');
    setQueryParam(params, 'q', next.q, '');
    setQueryParam(params, 'sort', next.sort, 'updatedAt');
    setQueryParam(params, 'direction', next.direction, 'desc');
    setQueryParam(params, 'page', String(next.page), '1');

    const query = params.toString();
    return query ? `/cases?${query}` : '/cases';
}

function buildExportHref(filters: NormalizedFilters) {
    const params = new URLSearchParams();
    setQueryParam(params, 'businessType', filters.businessType, 'all');
    setQueryParam(params, 'status', filters.status, 'all');
    setQueryParam(params, 'assignee', filters.assignee, 'all');
    setQueryParam(params, 'q', filters.q, '');

    const query = params.toString();
    return query ? `/api/cases/export-pdf?${query}` : '/api/cases/export-pdf';
}

function setQueryParam(params: URLSearchParams, key: string, value: string | number, defaultValue: string) {
    const stringValue = String(value);
    if (stringValue && stringValue !== defaultValue) {
        params.set(key, stringValue);
    }
}

function getSingleValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function getValidValue<T extends readonly string[]>(value: string | undefined, validValues: T, fallback: T[number]) {
    return validValues.includes((value ?? '') as T[number]) ? (value as T[number]) : fallback;
}

function getBusinessTypeLabels(caseRow: CaseListRow) {
    return [
        caseRow.hasDesign && '設計',
        caseRow.hasLandEstimate && '土地見積',
        caseRow.hasProvisionalSurvey && '仮測量',
        caseRow.hasConfirmedSurvey && '確定測量',
        caseRow.hasSubdivisionSurvey && '分筆測量',
        caseRow.hasOtherSurvey && 'その他測量',
        caseRow.hasConsultSurvey && 'コンサル測量',
        caseRow.hasLandReg && '土地登記',
        caseRow.hasBuildingReg && '建物登記',
        caseRow.hasFarmlandConversion && '農地転用',
        caseRow.hasDonationRevert && '寄付帰属',
    ].filter(Boolean) as string[];
}

function getAssigneeLabels(caseRow: CaseListRow) {
    return [
        caseRow.designerUserId && '設計',
        caseRow.surveyorUserId && '測量',
        caseRow.registrarUserId && '登記',
    ].filter(Boolean) as string[];
}

function formatDate(date: Date | string | null) {
    if (!date) return '-';
    return new Intl.DateTimeFormat('ja-JP', {
        month: 'numeric',
        day: 'numeric',
    }).format(new Date(date));
}

function escapeLike(value: string) {
    return value.replace(/[\\%_]/g, '\\$&');
}
