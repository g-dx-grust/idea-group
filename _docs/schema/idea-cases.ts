import {
    pgTable, text, timestamp, boolean, uuid, integer, date, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { ideaClients, ideaHoumukyoku } from './idea-masters';

// ─────────────────────────────────────────
// 現場（案件）本体
// ─────────────────────────────────────────
export const ideaCases = pgTable('idea_cases', {
    id: uuid('id').primaryKey().defaultRandom(),

    // 識別
    jutakuNo: text('jutaku_no').notNull(),           // 受託番号 例: 26-0001
    relatedJutakuNo: text('related_jutaku_no'),      // 関連受託番号
    cadNo: text('cad_no'),                           // CAD番号
    specialNote: text('special_note'),               // 特記事項

    // 案件基本情報
    title: text('title').notNull(),                  // 件名
    address: text('address').notNull(),              // 所在
    clientId: uuid('client_id').notNull().references(() => ideaClients.id),
    clientContactName: text('client_contact_name'),
    clientTel: text('client_tel'),
    clientFax: text('client_fax'),
    clientEmail: text('client_email'),
    clientEmailCc: text('client_email_cc'),

    // 担当者
    designerUserId: uuid('designer_user_id').references(() => users.id),
    surveyorUserId: uuid('surveyor_user_id').references(() => users.id),
    registrarUserId: uuid('registrar_user_id').references(() => users.id),

    // 業務区分フラグ（複数同時あり）
    hasDesign: boolean('has_design').default(false).notNull(),
    hasLandEstimate: boolean('has_land_estimate').default(false).notNull(),
    hasProvisionalSurvey: boolean('has_provisional_survey').default(false).notNull(),
    hasConfirmedSurvey: boolean('has_confirmed_survey').default(false).notNull(),
    hasSubdivisionSurvey: boolean('has_subdivision_survey').default(false).notNull(),
    hasOtherSurvey: boolean('has_other_survey').default(false).notNull(),
    hasConsultSurvey: boolean('has_consult_survey').default(false).notNull(),
    hasLandReg: boolean('has_land_reg').default(false).notNull(),
    hasBuildingReg: boolean('has_building_reg').default(false).notNull(),
    hasFarmlandConversion: boolean('has_farmland_conversion').default(false).notNull(),
    hasDonationRevert: boolean('has_donation_revert').default(false).notNull(),

    // 物理保管 箱番号
    boxNoDesign: text('box_no_design'),
    boxNoSurvey: text('box_no_survey'),
    boxNoRegTohshin: text('box_no_reg_tohshin'),     // 土地登記（東新）
    boxNoRegOther: text('box_no_reg_other'),

    // ステータス
    // 'draft' | 'in_progress' | 'done' | 'invoiced' | 'paid' | 'closed'
    status: text('status').default('in_progress').notNull(),

    // ファイル管理
    folderPath: text('folder_path'),  // S3 プレフィックス または ネットワークフォルダパス

    // タイムスタンプ
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id),
}, (table) => ({
    jutakuNoIdx: uniqueIndex('idea_cases_jutaku_no_idx').on(table.jutakuNo),
    clientIdx: index('idea_cases_client_idx').on(table.clientId),
    surveyorIdx: index('idea_cases_surveyor_idx').on(table.surveyorUserId),
    statusIdx: index('idea_cases_status_idx').on(table.status),
    createdAtIdx: index('idea_cases_created_at_idx').on(table.createdAt),
}));

// ─────────────────────────────────────────
// 設計タブ（設計1 / 設計2 = 申請種類ごとに複数行）
// ─────────────────────────────────────────
export const ideaCaseDesignItems = pgTable('idea_case_design_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),
    designNo: integer('design_no').notNull().default(1),  // 1 or 2
    applicationType: text('application_type'),  // 申請種類
    applicationScheduleDate: date('application_schedule_date'),
    submittedDate: date('submitted_date'),
    approvedDate: date('approved_date'),
    deliveredDate: date('delivered_date'),
    faxSentAt: date('fax_sent_at'),
    invoicedAt: date('invoiced_at'),
    collectedAt: date('collected_at'),
    note: text('note'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    caseIdx: index('idea_case_design_items_case_idx').on(table.caseId),
}));

// ─────────────────────────────────────────
// 仮測量タブ
// ─────────────────────────────────────────
export const ideaCaseProvisionalSurveys = pgTable('idea_case_provisional_surveys', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),
    requestedDate: date('requested_date'),       // 仮測量依頼日
    hasSurveyService: boolean('has_survey_service').default(false).notNull(), // 測量サービス有
    pdfKey: text('pdf_key'),                     // 仮測資料 S3 キー
    discardedKey: text('discarded_key'),         // 破棄 S3 キー
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    caseIdx: uniqueIndex('idea_prov_survey_case_idx').on(table.caseId),
}));

// ─────────────────────────────────────────
// 確定測量タブ
// ─────────────────────────────────────────
export const ideaCaseConfirmedSurveys = pgTable('idea_case_confirmed_surveys', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),
    acceptedDate: date('accepted_date'),         // 確定測量受託日
    scheduleOrDecided: text('schedule_or_decided'), // '予定' | '決定'
    houmuInvestDate: date('houmu_invest_date'),  // 法務局調査日
    cityInvestDate: date('city_invest_date'),    // 役所調査日
    hasSeirizuBrowse: boolean('has_seiriizu_browse').default(false).notNull(),
    seirizuBrowseDate: date('seiriizu_browse_date'),

    stampRequestDate: date('stamp_request_date'),
    stampReturnDate: date('stamp_return_date'),
    neighborSendDate: date('neighbor_send_date'),   // 隣地挨拶文送付日
    siteVisitSendDate: date('site_visit_send_date'), // 立会挨拶文送付日
    officialApplicationDate: date('official_application_date'), // 官立会申請日
    officialMeetingDate: date('official_meeting_date'),          // 官立会日
    certRequestDate: date('cert_request_date'),    // 証明書申請日
    certStampRequestDate: date('cert_stamp_request_date'),
    certSubmittedDate: date('cert_submitted_date'),
    certReturnDate: date('cert_return_date'),
    certCollectedDate: date('cert_collected_date'),
    completedDate: date('completed_date'),           // 成果完了日

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    caseIdx: uniqueIndex('idea_conf_survey_case_idx').on(table.caseId),
}));

// ─────────────────────────────────────────
// 分筆測量タブ（確定測量と構造が類似、別テーブル）
// ─────────────────────────────────────────
export const ideaCaseSubdivisionSurveys = pgTable('idea_case_subdivision_surveys', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),
    acceptedDate: date('accepted_date'),
    houmuInvestDate: date('houmu_invest_date'),
    cityInvestDate: date('city_invest_date'),
    stampRequestDate: date('stamp_request_date'),
    stampReturnDate: date('stamp_return_date'),
    neighborSendDate: date('neighbor_send_date'),
    siteVisitSendDate: date('site_visit_send_date'),
    officialApplicationDate: date('official_application_date'),
    officialMeetingDate: date('official_meeting_date'),
    certRequestDate: date('cert_request_date'),
    certSubmittedDate: date('cert_submitted_date'),
    certCollectedDate: date('cert_collected_date'),
    completedDate: date('completed_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    caseIdx: uniqueIndex('idea_subdiv_survey_case_idx').on(table.caseId),
}));

// ─────────────────────────────────────────
// 作業時間明細（現場 × 作業者 × 日付）
// ─────────────────────────────────────────
export const ideaWorkTimes = pgTable('idea_work_times', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),
    // どのタブの作業か
    // 'provisional_survey' | 'confirmed_survey' | 'subdivision_survey' | 'other_survey' | 'consult_survey'
    surveyType: text('survey_type').notNull(),
    workDate: date('work_date').notNull(),
    content: text('content'),                // 作業内容
    note: text('note'),
    isDone: boolean('is_done').default(false).notNull(),

    // 作業者1
    worker1UserId: uuid('worker1_user_id').references(() => users.id),
    workHours1: integer('work_hours1'),      // 分単位で保持（UI では時間表示）

    // 作業者2（同日複数人対応）
    worker2UserId: uuid('worker2_user_id').references(() => users.id),
    workHours2: integer('work_hours2'),

    // 作業者3
    worker3UserId: uuid('worker3_user_id').references(() => users.id),
    workHours3: integer('work_hours3'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    caseIdx: index('idea_work_times_case_idx').on(table.caseId),
    dateIdx: index('idea_work_times_date_idx').on(table.workDate),
    worker1Idx: index('idea_work_times_worker1_idx').on(table.worker1UserId),
}));

// ─────────────────────────────────────────
// 添付ファイル（案件に紐づく汎用ファイル）
// ─────────────────────────────────────────
export const ideaAttachments = pgTable('idea_attachments', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => ideaCases.id, { onDelete: 'cascade' }),
    // 'photo' | 'pdf' | 'cad' | 'report' | 'other'
    fileType: text('file_type').notNull(),
    fileName: text('file_name').notNull(),
    fileKey: text('file_key').notNull(),      // S3 オブジェクトキー
    fileSizeBytes: integer('file_size_bytes'),
    mimeType: text('mime_type'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
}, (table) => ({
    caseIdx: index('idea_attachments_case_idx').on(table.caseId),
}));

// ─────────────────────────────────────────
// 生成済み帳票ログ
// ─────────────────────────────────────────
export const ideaGeneratedDocuments = pgTable('idea_generated_documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').references(() => ideaCases.id),
    // 'estimate' | 'invoice' | 'receipt' | 'reward_calc' | 'site_visit_xxx' | 'progress_report'
    docType: text('doc_type').notNull(),
    fileKey: text('file_key').notNull(),      // S3 キー
    fileName: text('file_name').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    generatedByUserId: uuid('generated_by_user_id').references(() => users.id),
    note: text('note'),
}, (table) => ({
    caseIdx: index('idea_gen_docs_case_idx').on(table.caseId),
    typeIdx: index('idea_gen_docs_type_idx').on(table.docType),
}));
