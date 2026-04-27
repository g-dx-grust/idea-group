import {
    pgTable, text, timestamp, uuid, date, integer, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { ideaCases } from './idea-cases';
import { ideaLands } from './idea-lands';

// ─────────────────────────────────────────
// 立会申請
// ─────────────────────────────────────────
export const ideaSiteVisitRequests = pgTable('idea_site_visit_requests', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),
    surveyorUserId: uuid('surveyor_user_id').notNull().references(() => users.id),

    // 申請先（管轄で帳票テンプレートが切り替わる）
    // 'nagoya_city' | 'kita_nagoya_city' | 'aichi_pref' | 'other'
    appliedTo: text('applied_to').notNull(),
    appliedToName: text('applied_to_name'),     // その他の場合の市区町村名

    houmuInvestDate: date('houmu_invest_date'), // 法務局調査日
    inputDate: date('input_date'),
    route1: text('route1'),                     // 路線名1
    route2: text('route2'),
    route3: text('route3'),
    route4: text('route4'),
    note: text('note'),

    // 並び順モード: 'input' | 'chiban'
    sortMode: text('sort_mode').default('input').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
}, (table) => ({
    caseIdx: index('idea_site_visit_case_idx').on(table.caseId),
    surveyorIdx: index('idea_site_visit_surveyor_idx').on(table.surveyorUserId),
}));

// ─────────────────────────────────────────
// 立会申請 × 土地の関係
// ─────────────────────────────────────────
export const ideaSiteVisitLands = pgTable('idea_site_visit_lands', {
    id: uuid('id').primaryKey().defaultRandom(),
    siteVisitId: uuid('site_visit_id').notNull().references(() => ideaSiteVisitRequests.id, { onDelete: 'cascade' }),
    landId: uuid('land_id').notNull().references(() => ideaLands.id),

    // 'applicant' | 'neighbor' | 'opposite'
    landCategory: text('land_category').notNull(),
    // 'applicant' | 'neighbor' | 'opposite' | 'road' | 'public' etc.
    siteVisitType: text('site_visit_type'),  // 申請地/隣接地/対側地/道路/官有地

    sortOrder: integer('sort_order').default(0).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    siteVisitIdx: index('idea_svl_site_visit_idx').on(table.siteVisitId),
    landIdx: index('idea_svl_land_idx').on(table.landId),
}));

// ─────────────────────────────────────────
// 帳票生成履歴（立会申請に紐づく）
// ─────────────────────────────────────────
export const ideaSiteVisitDocuments = pgTable('idea_site_visit_documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    siteVisitId: uuid('site_visit_id').notNull().references(() => ideaSiteVisitRequests.id, { onDelete: 'cascade' }),

    // 帳票種別
    // 'neighbor_list'           隣接地所有者等一覧表
    // 'boundary_request'        土地境界立会のお願い
    // 'authorization'           委任状
    // 'greeting_hand'           調査・測量ご挨拶（持参用）
    // 'greeting_mail'           調査・測量ご挨拶（郵送用）
    // 'greeting_block'          ブロック内近隣者持参用
    // 'envelope_long3'          封筒（長3号）
    // 'envelope_kaku2'          封筒（角2号）
    // 'confirmation_nagoya'     確認申請書（名古屋市）
    // 'auth_nagoya'             確認申請書の委任状（名古屋市）
    // 'confirmation_ctrl'       確認申請書（控）
    // 'visit_report'            立会確認報告書
    // 'visit_report_ctrl'       立会確認報告書（控）
    // 'boundary_cert'           土地境界確定申請書（愛知県）
    // 'official_boundary'       官民境界承認願書（北名古屋市）
    // 'city_boundary'           市有土地境界確認申請書（北名古屋市）
    // 'pen_confirmation'        筆立会確認書
    // 'encroachment'            越境物確認書
    // 'survey_report_cover'     調査・測量報告書（表紙）
    docType: text('doc_type').notNull(),

    fileKey: text('file_key').notNull(),          // S3 キー
    fileName: text('file_name').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    generatedByUserId: uuid('generated_by_user_id').references(() => users.id),
}, (table) => ({
    siteVisitIdx: index('idea_svd_site_visit_idx').on(table.siteVisitId),
}));
