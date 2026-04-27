import {
    pgTable, text, timestamp, boolean, uuid, integer, date, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users'; // g-dx_kanri の既存 users テーブル

// ─────────────────────────────────────────
// 社員プロファイル（users を拡張）
// ─────────────────────────────────────────
export const ideaEmployeeProfiles = pgTable('idea_employee_profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    employeeNo: integer('employee_no').notNull(),
    role: text('role').notNull(), // 'staff' | 'office' | 'approver' | 'accounting' | 'admin'
    hireDate: date('hire_date'),
    leaveDate: date('leave_date'),
    isActive: boolean('is_active').default(true).notNull(),
    stampImageKey: text('stamp_image_key'), // S3 キー（印影）
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    userIdx: uniqueIndex('idea_emp_profile_user_idx').on(table.userId),
    empNoIdx: uniqueIndex('idea_emp_no_idx').on(table.employeeNo),
}));

// ─────────────────────────────────────────
// 単価マスタ
// ─────────────────────────────────────────
export const ideaUnitPrices = pgTable('idea_unit_prices', {
    id: uuid('id').primaryKey().defaultRandom(),
    // 業務区分: survey_confirmed / survey_subdivision / land_reg / building_reg / ...
    categoryCode: text('category_code').notNull(),
    // 作業区分: investigation / survey / application / document
    workTypeCode: text('work_type_code').notNull(),
    itemCode: text('item_code').notNull(),
    itemName: text('item_name').notNull(),
    subType: text('sub_type'), // 基本型 / 加算型 / 分筆型 など
    unitPrice: integer('unit_price').notNull(),
    unit: text('unit').notNull(),    // 筆 / 点 / 件 / 一式
    validFrom: date('valid_from').notNull(),
    validTo: date('valid_to'),
    note: text('note'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
}, (table) => ({
    categoryIdx: index('idea_unit_prices_category_idx').on(table.categoryCode, table.workTypeCode),
    validIdx: index('idea_unit_prices_valid_idx').on(table.validFrom, table.validTo),
}));

// ─────────────────────────────────────────
// 法務局マスタ
// ─────────────────────────────────────────
export const ideaHoumukyoku = pgTable('idea_houmukyoku', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    address: text('address'),
    tel: text('tel'),
    area: text('area'), // 所轄エリア（例：名古屋北部）
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    nameIdx: uniqueIndex('idea_houmukyoku_name_idx').on(table.name),
}));

// ─────────────────────────────────────────
// 依頼先（取引先）マスタ
// ─────────────────────────────────────────
export const ideaClients = pgTable('idea_clients', {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    nameKana: text('name_kana'),
    address: text('address'),
    tel: text('tel'),
    fax: text('fax'),
    email: text('email'),
    emailCc: text('email_cc'),
    contactName: text('contact_name'),         // 担当者氏名
    contactTitle: text('contact_title'),        // 担当者役職
    paymentTerms: text('payment_terms'),        // 支払条件
    bankName: text('bank_name'),               // 振込先銀行
    bankBranch: text('bank_branch'),
    bankAccountType: text('bank_account_type'), // 普通 / 当座
    bankAccountNo: text('bank_account_no'),
    bankAccountName: text('bank_account_name'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id),
}, (table) => ({
    codeIdx: uniqueIndex('idea_clients_code_idx').on(table.code),
    nameIdx: index('idea_clients_name_idx').on(table.name),
}));

// ─────────────────────────────────────────
// 勘定科目マスタ（経費精算 Lark → 会計 TXT マッピング用）
// ─────────────────────────────────────────
export const ideaAccountingSubjects = pgTable('idea_accounting_subjects', {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),               // 会計ソフト側の科目コード
    name: text('name').notNull(),               // 表示名
    larkPurchaseKeyword: text('lark_purchase_keyword'), // Lark Base「購入物」キーワード
    taxCategory: text('tax_category'),          // 課税 / 非課税 / 不課税
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    codeIdx: uniqueIndex('idea_acc_subjects_code_idx').on(table.code),
}));
