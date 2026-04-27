/**
 * 想定シードデータ
 * 実行方法: pnpm tsx scripts/idea-seed.ts
 *
 * 前提:
 *   - db.ts から drizzle インスタンスを取得できる
 *   - ideaEmployeeProfiles は users が存在してから INSERT
 */
import { db } from '../src/db';
import {
    ideaHoumukyoku,
    ideaClients,
    ideaUnitPrices,
    ideaAccountingSubjects,
} from './idea-index';

// ─── 法務局 ────────────────────────────────
const houmukyokuSeed = [
    { name: '名古屋法務局', address: '名古屋市中区三の丸二丁目2番1号', tel: '052-952-0107', area: '名古屋市全域' },
    { name: '名古屋法務局 北名古屋出張所', address: '北名古屋市九之坪村中一丁目26番地', tel: '0568-23-2146', area: '北名古屋市・清須市・あま市' },
    { name: '名古屋法務局 一宮支局', address: '一宮市九品座二丁目4番17号', tel: '0586-72-3801', area: '一宮市・稲沢市' },
    { name: '名古屋法務局 岡崎支局', address: '岡崎市明大寺町字川端20番地', tel: '0564-51-6900', area: '岡崎市・幸田町' },
    { name: '津地方法務局', address: '津市丸之内二十六番8号', tel: '059-228-4192', area: '三重県' },
];

// ─── 依頼先（サンプル） ─────────────────────
const clientSeed = [
    {
        code: 'C-001',
        name: '株式会社サンプル不動産',
        nameKana: 'カブシキガイシャサンプルフドウサン',
        address: '名古屋市中区栄三丁目15番1号',
        tel: '052-000-0001',
        fax: '052-000-0002',
        email: 'info@sample-fudosan.co.jp',
        contactName: '山田 太郎',
        contactTitle: '部長',
    },
    {
        code: 'C-002',
        name: '○○建設株式会社',
        nameKana: 'マルマルケンセツカブシキガイシャ',
        address: '名古屋市西区名西一丁目5番12号',
        tel: '052-000-0010',
        email: 'contact@sample-kensetsu.co.jp',
        contactName: '鈴木 一郎',
    },
    {
        code: 'C-003',
        name: '個人（小出 恵子）',
        address: '名古屋市中村区塩池町二丁目148番',
        tel: '052-000-0020',
        contactName: '小出 恵子',
    },
];

// ─── 勘定科目 ───────────────────────────────
const accountingSubjectSeed = [
    { code: '5001', name: '旅費交通費', larkPurchaseKeyword: '交通費', taxCategory: '課税', sortOrder: 1 },
    { code: '5002', name: '旅費交通費', larkPurchaseKeyword: 'IC カード', taxCategory: '課税', sortOrder: 2 },
    { code: '5003', name: '駐車場代', larkPurchaseKeyword: '駐車料', taxCategory: '課税', sortOrder: 3 },
    { code: '5101', name: '接待交際費', larkPurchaseKeyword: '飲食', taxCategory: '課税', sortOrder: 10 },
    { code: '5201', name: '消耗品費', larkPurchaseKeyword: '消耗品', taxCategory: '課税', sortOrder: 20 },
    { code: '5301', name: '通信費', larkPurchaseKeyword: '郵便', taxCategory: '課税', sortOrder: 30 },
    { code: '5401', name: '雑費', larkPurchaseKeyword: 'その他', taxCategory: '課税', sortOrder: 99 },
];

// ─── 単価マスタ（調査業務 抜粋） ────────────
const unitPriceSeed = [
    // 調査業務 - 資料調査
    { categoryCode: 'survey_confirmed', workTypeCode: 'investigation', itemCode: 'INV-001', itemName: '公課証明', unitPrice: 1000, unit: '通', validFrom: '2025-01-01' },
    { categoryCode: 'survey_confirmed', workTypeCode: 'investigation', itemCode: 'INV-002', itemName: '地図証明', unitPrice: 1000, unit: '通', validFrom: '2025-01-01' },
    { categoryCode: 'survey_confirmed', workTypeCode: 'investigation', itemCode: 'INV-003', itemName: '図面証明', unitPrice: 2200, unit: '通', validFrom: '2025-01-01' },
    { categoryCode: 'survey_confirmed', workTypeCode: 'investigation', itemCode: 'INV-004', itemName: '縁取書画', unitPrice: 4400, unit: '件', validFrom: '2025-01-01' },
    // 調査業務 - 現地調査（多角測量）
    { categoryCode: 'survey_confirmed', workTypeCode: 'investigation', itemCode: 'INV-010', itemName: '多角測量', unitPrice: 18900, unit: '筆', validFrom: '2025-01-01' },
    // 調査業務 - 現地調査（復元型）
    { categoryCode: 'survey_confirmed', workTypeCode: 'investigation', itemCode: 'INV-020', itemName: '復元測量 基本型', unitPrice: 32000, unit: '区画', validFrom: '2025-01-01' },
    { categoryCode: 'survey_confirmed', workTypeCode: 'investigation', itemCode: 'INV-021', itemName: '復元測量 加算型', unitPrice: 22200, unit: '筆', validFrom: '2025-01-01' },
    // 調査業務 - 立会・確認
    { categoryCode: 'survey_confirmed', workTypeCode: 'investigation', itemCode: 'INV-030', itemName: '立会・確認', unitPrice: 7400, unit: '筆', validFrom: '2025-01-01' },
    // 調査業務 - 公共用地（Aランク）
    { categoryCode: 'survey_confirmed', workTypeCode: 'investigation', itemCode: 'INV-041', itemName: '公共用地 Aランク', unitPrice: 16100, unit: '筆', validFrom: '2025-01-01' },
    { categoryCode: 'survey_confirmed', workTypeCode: 'investigation', itemCode: 'INV-042', itemName: '公共用地 Bランク', unitPrice: 53900, unit: '筆', validFrom: '2025-01-01' },
    { categoryCode: 'survey_confirmed', workTypeCode: 'investigation', itemCode: 'INV-043', itemName: '公共用地 Cランク', unitPrice: 65700, unit: '筆', validFrom: '2025-01-01' },
    // 測量業務 - 境界標設置
    { categoryCode: 'survey_confirmed', workTypeCode: 'survey', itemCode: 'SRV-010', itemName: '境界点設置', unitPrice: 10000, unit: '点', validFrom: '2025-01-01' },
    { categoryCode: 'survey_confirmed', workTypeCode: 'survey', itemCode: 'SRV-020', itemName: '境界標設置・移設', unitPrice: 11100, unit: '点', validFrom: '2025-01-01' },
    { categoryCode: 'survey_confirmed', workTypeCode: 'survey', itemCode: 'SRV-030', itemName: '引照点測量', unitPrice: 11520, unit: '点', validFrom: '2025-01-01' },
    // 書類作成 - 証明書
    { categoryCode: 'survey_confirmed', workTypeCode: 'document', itemCode: 'DOC-010', itemName: '土地証明書・承諾書', unitPrice: 4800, unit: '通', validFrom: '2025-01-01' },
    { categoryCode: 'survey_confirmed', workTypeCode: 'document', itemCode: 'DOC-020', itemName: '土地成果図', unitPrice: 5000, unit: '通', validFrom: '2025-01-01' },
];

export async function seedIdeaMasters() {
    console.log('Seeding idea_houmukyoku...');
    for (const row of houmukyokuSeed) {
        await db.insert(ideaHoumukyoku).values(row).onConflictDoNothing();
    }

    console.log('Seeding idea_clients...');
    for (const row of clientSeed) {
        await db.insert(ideaClients).values({ ...row, isActive: true }).onConflictDoNothing();
    }

    console.log('Seeding idea_accounting_subjects...');
    for (const row of accountingSubjectSeed) {
        await db.insert(ideaAccountingSubjects).values({ ...row, isActive: true }).onConflictDoNothing();
    }

    console.log('Seeding idea_unit_prices...');
    for (const row of unitPriceSeed) {
        await db.insert(ideaUnitPrices).values({ ...row, isActive: true }).onConflictDoNothing();
    }

    console.log('Done.');
}

// 直接実行の場合
if (require.main === module) {
    seedIdeaMasters().catch(console.error);
}
