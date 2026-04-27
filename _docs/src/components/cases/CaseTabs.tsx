'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface CaseRow {
    hasDesign: boolean;
    hasProvisionalSurvey: boolean;
    hasConfirmedSurvey: boolean;
    hasSubdivisionSurvey: boolean;
    hasOtherSurvey: boolean;
    hasConsultSurvey: boolean;
    hasLandReg: boolean;
    hasBuildingReg: boolean;
    hasFarmlandConversion: boolean;
    hasDonationRevert: boolean;
}

interface Props {
    caseId: string;
    caseRow: CaseRow;
}

export function CaseTabs({ caseId, caseRow }: Props) {
    const pathname = usePathname();
    const base = `/cases/${caseId}`;

    const tabs = [
        // 常に表示
        { label: '設計', href: `${base}/design`, show: true },
        { label: '仮測量', href: `${base}/provisional-survey`, show: true },
        { label: '確定測量', href: `${base}/confirmed-survey`, show: true },
        { label: '分筆測量', href: `${base}/subdivision-survey`, show: true },
        { label: 'その他測量', href: `${base}/other-survey`, show: caseRow.hasOtherSurvey },
        { label: '写真・PDF', href: `${base}/files`, show: true },
        { label: '土地登記事項他', href: `${base}/lands`, show: true },
        { label: '立会申請', href: `${base}/site-visits`, show: true },
        { label: '隣地確認', href: `${base}/neighbors`, show: true },
        { label: '土地登記', href: `${base}/land-registration`, show: true },
        { label: '建物登記', href: `${base}/building-registration`, show: caseRow.hasBuildingReg },
        { label: '農地転用', href: `${base}/farmland-conversion`, show: caseRow.hasFarmlandConversion },
        { label: '寄付帰属', href: `${base}/donation-revert`, show: caseRow.hasDonationRevert },
        { label: 'コンサル測量', href: `${base}/consult-survey`, show: caseRow.hasConsultSurvey },
        { label: '報酬額計算書', href: `${base}/rewards`, show: true },
    ].filter((t) => t.show);

    return (
        <nav className="border-b bg-white sticky top-0 z-10">
            <div className="flex overflow-x-auto scrollbar-hide px-4 gap-0">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                'shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                                isActive
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                            )}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
