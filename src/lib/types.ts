export const caseStatuses = ['draft', 'in_progress', 'done', 'invoiced', 'paid', 'closed'] as const;

export type CaseStatus = (typeof caseStatuses)[number];

export const businessTypes = [
  'design',
  'land_estimate',
  'provisional_survey',
  'confirmed_survey',
  'subdivision_survey',
  'other_survey',
  'consult_survey',
  'land_registration',
  'building_registration',
  'farmland_conversion',
  'donation_revert',
] as const;

export type BusinessType = (typeof businessTypes)[number];

export const rewardSections = ['investigation', 'survey', 'application', 'document'] as const;

export type RewardSection = (typeof rewardSections)[number];

export type TaxRounding = 'floor' | 'round';

export const calendarEventTypes = ['site_visit', 'field_survey', 'client_visit', 'office_work'] as const;

export type CalendarEventType = (typeof calendarEventTypes)[number];

export const calendarEventStatuses = ['scheduled', 'done', 'cancelled'] as const;

export type CalendarEventStatus = (typeof calendarEventStatuses)[number];

export type SurveyScheduleStatus = 'scheduled' | 'decided';

export type SiteVisitSortMode = 'input' | 'chiban';

export interface User {
  id: string;
  name: string;
  role: 'staff' | 'office' | 'approver' | 'accounting' | 'admin';
  department: string;
}

export interface Client {
  id: string;
  code: string;
  name: string;
  address: string;
  tel?: string;
  fax?: string;
  email?: string;
  contactName?: string;
  paymentTerms?: string;
}

export interface LandOwner {
  id: string;
  name: string;
  address: string;
  share?: string;
  postalCode?: string;
  tel?: string;
}

export interface Land {
  id: string;
  fudoNo?: string;
  address: string;
  chiban: string;
  edaban?: string;
  chimoku?: string;
  chiseki?: number;
  inputDate?: string;
  owners: LandOwner[];
}

export interface SurveyProgress {
  acceptedDate?: string;
  scheduleOrDecided?: SurveyScheduleStatus;
  houmuInvestDate?: string;
  cityInvestDate?: string;
  hasSeirizuBrowse?: boolean;
  seirizuBrowseDate?: string;
  stampRequestDate?: string;
  stampReturnDate?: string;
  neighborSendDate?: string;
  siteVisitSendDate?: string;
  officialApplicationDate?: string;
  officialMeetingDate?: string;
  certRequestDate?: string;
  certStampRequestDate?: string;
  certSubmittedDate?: string;
  certReturnDate?: string;
  certCollectedDate?: string;
  completedDate?: string;
}

export interface SiteVisitRequest {
  id: string;
  appliedTo: 'nagoya_city' | 'kita_nagoya_city' | 'aichi_pref' | 'other';
  appliedToName?: string;
  surveyorUserId: string;
  houmuInvestDate?: string;
  inputDate: string;
  routeNames: string[];
  landIds: string[];
  note?: string;
  sortMode?: SiteVisitSortMode;
  generatedDocumentCount: number;
}

export interface RewardDetail {
  id: string;
  section: RewardSection;
  itemName: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface RewardTotals {
  subtotal1: number;
  subtotal2: number;
  subtotal3: number;
  subtotal4: number;
  totalReward: number;
  adjustAmount: number;
  netReward: number;
  miscExpense: number;
  taxBase: number;
  taxAmount: number;
  stampCost: number;
  total: number;
}

export interface RewardRecord extends RewardTotals {
  id: string;
  businessName: string;
  address: string;
  recipientName: string;
  formVersion: 'new' | 'old';
  estimateDate?: string;
  invoiceDate?: string;
  paidDate?: string;
  receiptDate?: string;
  receiptSentDate?: string;
  requireSend: boolean;
  taxRate: number;
  taxRounding: TaxRounding;
  details: RewardDetail[];
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  caseId: string;
  userId: string;
  type: CalendarEventType;
  status: CalendarEventStatus;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  note?: string;
  sourceType: 'case' | 'calendar' | 'site_visit';
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseRecord {
  id: string;
  jutakuNo: string;
  relatedJutakuNo?: string;
  cadNo?: string;
  title: string;
  address: string;
  clientId: string;
  clientContactName?: string;
  clientTel?: string;
  clientFax?: string;
  clientEmail?: string;
  clientEmailCc?: string;
  designerUserId?: string;
  surveyorUserId?: string;
  registrarUserId?: string;
  businessTypes: BusinessType[];
  boxNoDesign?: string;
  boxNoSurvey?: string;
  boxNoRegTohshin?: string;
  boxNoRegOther?: string;
  specialNote?: string;
  status: CaseStatus;
  folderPath?: string;
  deadline?: string;
  confirmedSurvey: SurveyProgress;
  subdivisionSurvey: SurveyProgress;
  lands: Land[];
  siteVisits: SiteVisitRequest[];
  rewards: RewardRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface UnitPrice {
  id: string;
  categoryCode: string;
  section: RewardSection;
  itemName: string;
  unitPrice: number;
  unit: string;
}

export interface AuditLog {
  id: string;
  targetType: 'case' | 'reward' | 'site_visit' | 'land' | 'calendar_event';
  targetId: string;
  action: string;
  message: string;
  createdAt: string;
}

export interface IdeaStore {
  users: User[];
  clients: Client[];
  unitPrices: UnitPrice[];
  cases: CaseRecord[];
  calendarEvents: CalendarEvent[];
  auditLogs: AuditLog[];
}

export interface CaseListFilters {
  q?: string;
  status?: CaseStatus | 'all';
  businessType?: BusinessType | 'all';
  assignee?: 'all' | 'designer' | 'surveyor' | 'registrar' | 'unassigned';
}
