import {
    pgTable, text, timestamp, uuid, numeric, date, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { ideaCases } from './idea-cases';

// ─────────────────────────────────────────
// 土地
// ─────────────────────────────────────────
export const ideaLands = pgTable('idea_lands', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),

    fudoNo: text('fudo_no'),                 // 不動産番号
    address: text('address').notNull(),       // 所在
    chiban: text('chiban').notNull(),         // 地番
    edaban: text('edaban'),                   // 枝番
    chimoku: text('chimoku'),                 // 地目（田/畑/宅地/山林/雑種地 etc.）
    chiseki: numeric('chiseki', { precision: 12, scale: 2 }), // 地積 m²
    inputDate: date('input_date'),

    // 土地登記情報インポート元
    registryImportedAt: timestamp('registry_imported_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
}, (table) => ({
    caseIdx: index('idea_lands_case_idx').on(table.caseId),
    chibанIdx: index('idea_lands_chiban_idx').on(table.chiban),
}));

// ─────────────────────────────────────────
// 土地所有者
// ─────────────────────────────────────────
export const ideaLandOwners = pgTable('idea_land_owners', {
    id: uuid('id').primaryKey().defaultRandom(),
    landId: uuid('land_id').notNull().references(() => ideaLands.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),              // 氏名（法人は商号）
    address: text('address'),                  // 住所（所在）
    postalCode: text('postal_code'),
    repTitle: text('rep_title'),               // 代表者役職（法人）
    repName: text('rep_name'),                 // 代表者氏名（法人）
    share: text('share'),                      // 持分（例: 1/2, 38347分の441）
    tel: text('tel'),
    sortOrder: text('sort_order'),             // 並び順メモ

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    landIdx: index('idea_land_owners_land_idx').on(table.landId),
}));

// ─────────────────────────────────────────
// 隣地確認
// ─────────────────────────────────────────
export const ideaNeighborConfirmations = pgTable('idea_neighbor_confirmations', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),
    landId: uuid('land_id').references(() => ideaLands.id),

    address: text('address'),
    chiban: text('chiban'),
    edaban: text('edaban'),
    chimoku: text('chimoku'),
    preGreetingDate: date('pre_greeting_date'),        // 事前挨拶日
    siteVisitDate: date('site_visit_date'),            // 立会年月日
    siteVisitTime: text('site_visit_time'),            // 立会時（例: 10:00）
    confirmedDate: date('confirmed_date'),             // 確認年月日
    witnesserName: text('witnesser_name'),             // 立会者
    witnesserAddress: text('witnesser_address'),       // 立会者住所
    relationToOwner: text('relation_to_owner'),        // 所有者との関係

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    caseIdx: index('idea_neighbor_conf_case_idx').on(table.caseId),
}));
