import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CaseStatusBadge } from './CaseStatusBadge';

interface CaseRow {
    id: string;
    jutakuNo: string;
    title: string;
    address: string;
    status: string;
    clientName: string | null;
    hasDesign: boolean;
    hasProvisionalSurvey: boolean;
    hasConfirmedSurvey: boolean;
    hasSubdivisionSurvey: boolean;
    hasLandReg: boolean;
    hasBuildingReg: boolean;
    hasFarmlandConversion: boolean;
    hasDonationRevert: boolean;
}

const BUSINESS_TYPE_LABELS: Record<keyof Pick<CaseRow,
    'hasDesign' | 'hasProvisionalSurvey' | 'hasConfirmedSurvey' | 'hasSubdivisionSurvey' |
    'hasLandReg' | 'hasBuildingReg' | 'hasFarmlandConversion' | 'hasDonationRevert'
>, string> = {
    hasDesign: '設計',
    hasProvisionalSurvey: '仮測量',
    hasConfirmedSurvey: '確定測量',
    hasSubdivisionSurvey: '分筆測量',
    hasLandReg: '土地登記',
    hasBuildingReg: '建物登記',
    hasFarmlandConversion: '農地転用',
    hasDonationRevert: '寄付帰属',
};

export function CaseHeader({ caseRow }: { caseRow: CaseRow }) {
    const activeTypes = Object.entries(BUSINESS_TYPE_LABELS)
        .filter(([key]) => caseRow[key as keyof typeof BUSINESS_TYPE_LABELS])
        .map(([, label]) => label);

    return (
        <div className="bg-white border-b px-4 py-3 md:px-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link href="/cases" className="flex items-center gap-1 hover:text-gray-700">
                    <ChevronLeft className="w-4 h-4" />
                    現場一覧
                </Link>
                <span>/</span>
                <span className="font-mono">{caseRow.jutakuNo}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                <div>
                    <h1 className="text-lg font-bold text-gray-900">{caseRow.title}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {caseRow.address}
                        {caseRow.clientName && (
                            <span className="ml-2 text-gray-400">｜{caseRow.clientName}</span>
                        )}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                        <CaseStatusBadge status={caseRow.status} />
                        {activeTypes.map((label) => (
                            <Badge key={label} variant="outline" className="text-xs">
                                {label}
                            </Badge>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/api/cases/${caseRow.id}/export-pdf?type=jutakubo`} target="_blank">
                            受託簿 PDF
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/api/cases/${caseRow.id}/export-pdf?type=uketsukebo`} target="_blank">
                            受付簿
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
