import { notFound } from 'next/navigation';
import { db } from '@idea/database';
import { ideaCases, ideaClients } from '@idea/database/schema';
import { eq } from 'drizzle-orm';
import { CaseHeader } from '@/components/cases/CaseHeader';
import { CaseTabs } from '@/components/cases/CaseTabs';

interface Props {
    children: React.ReactNode;
    params: { caseId: string };
}

export default async function CaseDetailLayout({ children, params }: Props) {
    const [caseRow] = await db
        .select({
            id: ideaCases.id,
            jutakuNo: ideaCases.jutakuNo,
            title: ideaCases.title,
            address: ideaCases.address,
            status: ideaCases.status,
            clientId: ideaCases.clientId,
            clientName: ideaClients.name,
            // 業務区分フラグ
            hasDesign: ideaCases.hasDesign,
            hasProvisionalSurvey: ideaCases.hasProvisionalSurvey,
            hasConfirmedSurvey: ideaCases.hasConfirmedSurvey,
            hasSubdivisionSurvey: ideaCases.hasSubdivisionSurvey,
            hasOtherSurvey: ideaCases.hasOtherSurvey,
            hasConsultSurvey: ideaCases.hasConsultSurvey,
            hasLandReg: ideaCases.hasLandReg,
            hasBuildingReg: ideaCases.hasBuildingReg,
            hasFarmlandConversion: ideaCases.hasFarmlandConversion,
            hasDonationRevert: ideaCases.hasDonationRevert,
        })
        .from(ideaCases)
        .leftJoin(ideaClients, eq(ideaCases.clientId, ideaClients.id))
        .where(eq(ideaCases.id, params.caseId))
        .limit(1);

    if (!caseRow) notFound();

    return (
        <div className="flex flex-col min-h-screen">
            <CaseHeader caseRow={caseRow} />
            <CaseTabs caseId={params.caseId} caseRow={caseRow} />
            <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
    );
}
