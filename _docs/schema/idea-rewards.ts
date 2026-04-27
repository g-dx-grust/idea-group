import {
    pgTable, text, timestamp, boolean, uuid, integer, numeric, date, index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { ideaCases } from './idea-cases';

// ─────────────────────────────────────────
// 報酬額計算書（1 案件 × 1 業務 = 1 件。複数業務なら複数レコード）
// ─────────────────────────────────────────
export const ideaRewards = pgTable('idea_rewards', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),

    // 帳票基本情報
    businessName: text('business_name').notNull(),    // 業務名（例: 筆界確定測量業務）
    address: text('address').notNull(),               // 所在
    recipientName: text('recipient_name').notNull(),  // 宛名

    // 様式 'new' | 'old'
    formVersion: text('form_version').default('new').notNull(),

    // 金額集計（自動計算でも保存しておく）
    subtotal1: integer('subtotal1').default(0).notNull(), // 調査業務 小計①
    subtotal2: integer('subtotal2').default(0).notNull(), // 測量業務 小計②
    subtotal3: integer('subtotal3').default(0).notNull(), // 申請手続 小計③
    subtotal4: integer('subtotal4').default(0).notNull(), // 書類作成 小計④
    totalReward: integer('total_reward').default(0).notNull(),  // ①+②+③+④ 合計報酬額
    adjustAmount: integer('adjust_amount').default(0).notNull(), // 調整額
    netReward: integer('net_reward').default(0).notNull(),       // 差引報酬額（totalReward - adjustAmount）
    miscExpense: integer('misc_expense').default(0).notNull(),   // 諸経費
    taxBase: integer('tax_base').default(0).notNull(),           // 課税標準（netReward + miscExpense）
    taxAmount: integer('tax_amount').default(0).notNull(),       // 消費税
    taxRate: integer('tax_rate').default(10).notNull(),          // 税率（%）
    // 'floor' | 'round'
    taxRounding: text('tax_rounding').default('floor').notNull(),
    stampCost: integer('stamp_cost').default(0).notNull(),       // 立替金（収入印紙等）
    total: integer('total').default(0).notNull(),                // 総合計

    // 見積
    estimateDate: date('estimate_date'),
    // 請求
    invoiceDate: date('invoice_date'),
    requireSend: boolean('require_send').default(false).notNull(), // 要送付
    // 入金・領収
    paidDate: date('paid_date'),
    receiptDate: date('receipt_date'),
    receiptSentDate: date('receipt_sent_date'),

    note: text('note'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
}, (table) => ({
    caseIdx: index('idea_rewards_case_idx').on(table.caseId),
    estimateDateIdx: index('idea_rewards_estimate_date_idx').on(table.estimateDate),
    invoiceDateIdx: index('idea_rewards_invoice_date_idx').on(table.invoiceDate),
}));

// ─────────────────────────────────────────
// 報酬額明細（調査/測量/申請/書類 の各行）
// ─────────────────────────────────────────
export const ideaRewardDetails = pgTable('idea_reward_details', {
    id: uuid('id').primaryKey().defaultRandom(),
    rewardId: uuid('reward_id').notNull().references(() => ideaRewards.id, { onDelete: 'cascade' }),

    // セクション: 'investigation' | 'survey' | 'application' | 'document'
    section: text('section').notNull(),

    // 単価マスタ由来
    itemCode: text('item_code'),
    itemName: text('item_name').notNull(),
    subType: text('sub_type'),               // 基本型 / 加算型 / 分筆型 など

    unitPrice: integer('unit_price').notNull(),
    quantity: numeric('quantity', { precision: 8, scale: 2 }).notNull(),
    unit: text('unit').notNull(),            // 筆 / 点 / 件 / 通 / m² など
    rate: integer('rate').default(100).notNull(), // 加減率 %（100 = そのまま）
    amount: integer('amount').notNull(),     // 最終金額 = unitPrice × quantity × rate/100

    note: text('note'),
    sortOrder: integer('sort_order').default(0).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    rewardIdx: index('idea_reward_details_reward_idx').on(table.rewardId),
    sectionIdx: index('idea_reward_details_section_idx').on(table.section),
}));

// ─────────────────────────────────────────
// 見積書（reports: 発行ごとに保存）
// ─────────────────────────────────────────
export const ideaEstimateDocs = pgTable('idea_estimate_docs', {
    id: uuid('id').primaryKey().defaultRandom(),
    rewardId: uuid('reward_id').notNull().references(() => ideaRewards.id, { onDelete: 'cascade' }),
    issuedDate: date('issued_date').notNull(),
    fileKey: text('file_key').notNull(),       // S3 キー
    snapshotTotal: integer('snapshot_total').notNull(), // 発行時点の総合計額
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    generatedByUserId: uuid('generated_by_user_id').references(() => users.id),
}, (table) => ({
    rewardIdx: index('idea_estimate_docs_reward_idx').on(table.rewardId),
}));

// ─────────────────────────────────────────
// 請求書
// ─────────────────────────────────────────
export const ideaInvoiceDocs = pgTable('idea_invoice_docs', {
    id: uuid('id').primaryKey().defaultRandom(),
    rewardId: uuid('reward_id').notNull().references(() => ideaRewards.id, { onDelete: 'cascade' }),
    issuedDate: date('issued_date').notNull(),
    // 振込先（発行時にスナップショット）
    bankName: text('bank_name'),
    bankBranch: text('bank_branch'),
    bankAccountType: text('bank_account_type'),
    bankAccountNo: text('bank_account_no'),
    bankAccountName: text('bank_account_name'),
    fileKey: text('file_key').notNull(),
    snapshotTotal: integer('snapshot_total').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    generatedByUserId: uuid('generated_by_user_id').references(() => users.id),
}, (table) => ({
    rewardIdx: index('idea_invoice_docs_reward_idx').on(table.rewardId),
}));

// ─────────────────────────────────────────
// 領収書
// ─────────────────────────────────────────
export const ideaReceiptDocs = pgTable('idea_receipt_docs', {
    id: uuid('id').primaryKey().defaultRandom(),
    rewardId: uuid('reward_id').notNull().references(() => ideaRewards.id, { onDelete: 'cascade' }),
    issuedDate: date('issued_date').notNull(),
    amount: integer('amount').notNull(),
    fileKey: text('file_key').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    generatedByUserId: uuid('generated_by_user_id').references(() => users.id),
}, (table) => ({
    rewardIdx: index('idea_receipt_docs_reward_idx').on(table.rewardId),
}));

// ─────────────────────────────────────────
// 進捗報告書送信ログ
// ─────────────────────────────────────────
export const ideaProgressReportLogs = pgTable('idea_progress_report_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id),
    fileKey: text('file_key').notNull(),
    sentToEmail: text('sent_to_email').notNull(),
    sentCcEmail: text('sent_cc_email'),
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
    sentByUserId: uuid('sent_by_user_id').references(() => users.id),
}, (table) => ({
    caseIdx: index('idea_progress_report_case_idx').on(table.caseId),
    sentAtIdx: index('idea_progress_report_sent_at_idx').on(table.sentAt),
}));
