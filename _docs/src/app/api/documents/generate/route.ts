import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@idea/database';
import {
    ideaRewards, ideaRewardDetails, ideaCases, ideaClients,
    ideaEstimateDocs, ideaInvoiceDocs,
} from '@idea/database/schema';
import { eq } from 'drizzle-orm';
import { generateEstimatePdf } from '@/lib/pdf/estimate';
import { generateInvoicePdf } from '@/lib/pdf/invoice';
import { generateRewardCalcPdf } from '@/lib/pdf/reward-calc';
import { uploadToS3 } from '@/lib/storage';
import { toWareki } from '@/lib/wareki';

const bodySchema = z.object({
    rewardId: z.string().uuid(),
    // 'estimate' | 'invoice' | 'reward_calc' | 'receipt'
    docType: z.enum(['estimate', 'invoice', 'reward_calc', 'receipt']),
});

export async function POST(req: NextRequest) {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { rewardId, docType } = parsed.data;

    // データ取得
    const [reward] = await db
        .select()
        .from(ideaRewards)
        .where(eq(ideaRewards.id, rewardId))
        .limit(1);
    if (!reward) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const details = await db
        .select()
        .from(ideaRewardDetails)
        .where(eq(ideaRewardDetails.rewardId, rewardId))
        .orderBy(ideaRewardDetails.section, ideaRewardDetails.sortOrder);

    const [caseRow] = await db
        .select({ clientId: ideaCases.clientId })
        .from(ideaCases)
        .where(eq(ideaCases.id, reward.caseId))
        .limit(1);

    const [client] = caseRow?.clientId
        ? await db.select().from(ideaClients).where(eq(ideaClients.id, caseRow.clientId)).limit(1)
        : [null];

    // PDF 生成
    let pdfBuffer: Buffer;
    let fileName: string;

    const templateData = {
        reward,
        details,
        client: client ?? undefined,
        issuedDate: toWareki(new Date()),
    };

    switch (docType) {
        case 'estimate':
            pdfBuffer = await generateEstimatePdf(templateData);
            fileName = `御見積書_${reward.businessName}_${Date.now()}.pdf`;
            break;
        case 'invoice':
            pdfBuffer = await generateInvoicePdf(templateData);
            fileName = `御請求書_${reward.businessName}_${Date.now()}.pdf`;
            break;
        case 'reward_calc':
            pdfBuffer = await generateRewardCalcPdf(templateData);
            fileName = `報酬額計算書_${reward.businessName}_${Date.now()}.pdf`;
            break;
        default:
            return NextResponse.json({ error: 'Unsupported docType' }, { status: 400 });
    }

    // S3 アップロード
    const fileKey = `rewards/${rewardId}/${fileName}`;
    await uploadToS3(fileKey, pdfBuffer, 'application/pdf');

    // DB に記録
    if (docType === 'estimate') {
        await db.insert(ideaEstimateDocs).values({
            rewardId,
            issuedDate: reward.estimateDate ?? new Date().toISOString().slice(0, 10),
            fileKey,
            snapshotTotal: reward.total,
        });
    } else if (docType === 'invoice') {
        await db.insert(ideaInvoiceDocs).values({
            rewardId,
            issuedDate: reward.invoiceDate ?? new Date().toISOString().slice(0, 10),
            fileKey,
            snapshotTotal: reward.total,
            bankName: client?.bankName ?? undefined,
            bankBranch: client?.bankBranch ?? undefined,
            bankAccountType: client?.bankAccountType ?? undefined,
            bankAccountNo: client?.bankAccountNo ?? undefined,
            bankAccountName: client?.bankAccountName ?? undefined,
        });
    }

    // プリサインド URL を返す（フロントは新タブで開く）
    const { getSignedDownloadUrl } = await import('@/lib/storage');
    const url = await getSignedDownloadUrl(fileKey, 300); // TTL 5 分

    return NextResponse.json({ url, fileName });
}
