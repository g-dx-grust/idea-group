import {
    pgTable, text, timestamp, boolean, uuid, date, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { ideaCases } from './idea-cases';
import { ideaHoumukyoku } from './idea-masters';

// ─────────────────────────────────────────
// 土地登記事件
// ─────────────────────────────────────────
export const ideaLandRegistrationCases = pgTable('idea_land_registration_cases', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),
    houmukyokuId: uuid('houmukyoku_id').references(() => ideaHoumukyoku.id),

    // 事件受託
    jikenNo: text('jiken_no'),                         // 事件簿受託番号
    acceptedDate: date('accepted_date'),               // 土地登記事件受託日
    registrationPurpose: text('registration_purpose'), // 登記の目的（例: 分筆, 合筆, 地積更正）
    applicationAddress: text('application_address'),   // 申請地
    deadline: date('deadline'),                        // 期限

    // 作業進捗
    docInvestDate: date('doc_invest_date'),            // 資料調査日
    siteInvestDate: date('site_invest_date'),          // 現地調査日
    drawingDate: date('drawing_date'),                 // 図面作成日

    // 登記申請
    stampRequestDate: date('stamp_request_date'),
    stampReturnDate: date('stamp_return_date'),
    applicationDate: date('application_date'),         // 登記申請日
    mailApplication: boolean('mail_application').default(false).notNull(),     // 郵送で申請
    mailReturn: boolean('mail_return').default(false).notNull(),               // 郵送で回収
    completionDate: date('completion_date'),           // 登記受領日
    deliveryDate: date('delivery_date'),               // 登記済証引渡日

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
}, (table) => ({
    caseIdx: index('idea_land_reg_case_idx').on(table.caseId),
}));

// ─────────────────────────────────────────
// 建物登記事件
// ─────────────────────────────────────────
export const ideaBuildingRegistrationCases = pgTable('idea_building_registration_cases', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),
    houmukyokuId: uuid('houmukyoku_id').references(() => ideaHoumukyoku.id),

    jikenNo: text('jiken_no'),
    acceptedDate: date('accepted_date'),
    registrationPurpose: text('registration_purpose'), // 登記の目的（例: 新築建物表題登記）
    chibanList: text('chiban_list'),                   // 関連地番（複数可、カンマ区切り）
    applicantName: text('applicant_name'),             // 申請人
    deadline: date('deadline'),

    // 作業
    docInvestDate: date('doc_invest_date'),
    siteInvestDate: date('site_invest_date'),
    drawingDate: date('drawing_date'),
    docCreateDate: date('doc_create_date'),            // 書類作成日

    // 申請
    stampRequestDate: date('stamp_request_date'),
    stampReceivedDate: date('stamp_received_date'),
    applicationDate: date('application_date'),
    mailApplication: boolean('mail_application').default(false).notNull(),
    mailReturn: boolean('mail_return').default(false).notNull(),
    completionDate: date('completion_date'),
    deliveryDate: date('delivery_date'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
}, (table) => ({
    caseIdx: index('idea_bldg_reg_case_idx').on(table.caseId),
}));

// ─────────────────────────────────────────
// 農地転用
// ─────────────────────────────────────────
export const ideaFarmlandConversions = pgTable('idea_farmland_conversions', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),

    acceptedDate: date('accepted_date'),               // 農転受託日
    // 'seller' | 'buyer'
    createdFor: text('created_for'),                   // 作成（売主/買主）
    conversionPeriod: text('conversion_period'),       // 農転時期
    transferDate: date('transfer_date'),               // 移転予定日

    // 農転条項・種別
    articleType: text('article_type'),                 // '4条' | '5条'
    applicationType: text('application_type'),         // '届出' | '許可'
    rightType: text('right_type'),                     // '所有権' | '賃借権'
    purpose: text('purpose'),                          // 目的

    constructionStartDate: date('construction_start_date'),
    constructionEndDate: date('construction_end_date'),
    rightDuration: text('right_duration'),             // 権利存続期間
    currentChimoku: text('current_chimoku'),           // 現況地目

    // 用水関係
    hasWater: boolean('has_water').default(false).notNull(),
    waterName: text('water_name'),                     // 用水関係名称

    // 譲受人（賃借人）（複数対応は JSONB）
    transfereesJson: text('transferees_json'),         // JSON string [{name, share, occupation}]

    // 譲渡人（賃貸人）
    transferorsJson: text('transferors_json'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    caseIdx: uniqueIndex('idea_farmland_case_idx').on(table.caseId),
}));

// ─────────────────────────────────────────
// 寄付帰属
// ─────────────────────────────────────────
export const ideaDonationReverts = pgTable('idea_donation_reverts', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),

    // '寄付' | '帰属'
    donationType: text('donation_type').notNull(),
    // 'idea' | 'other'
    applicantType: text('applicant_type').notNull(),

    acceptedDate: date('accepted_date'),              // 寄付帰属受託日
    donationPeriod: text('donation_period'),          // 寄付帰属時期
    applicationChibanList: text('application_chiban_list'),

    // 日程
    docCreatedDate: date('doc_created_date'),         // 書類作成日
    stampRequestDate: date('stamp_request_date'),
    stampReceivedDate: date('stamp_received_date'),
    applicationScheduleDate: date('application_schedule_date'),
    stampCertExpiry: date('stamp_cert_expiry'),       // 印鑑証明期限
    applicationDate: date('application_date'),

    memo: text('memo'),
    note: text('note'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    caseIdx: uniqueIndex('idea_donation_revert_case_idx').on(table.caseId),
}));
