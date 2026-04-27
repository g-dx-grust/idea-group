import type { BusinessType, CalendarEventStatus, CalendarEventType, CaseStatus, RewardSection, SiteVisitRequest } from './types';

export const statusLabels: Record<CaseStatus, string> = {
  draft: '下書き',
  in_progress: '進行中',
  done: '成果完了',
  invoiced: '請求済',
  paid: '入金済',
  closed: '終了',
};

export const businessTypeLabels: Record<BusinessType, string> = {
  design: '設計',
  land_estimate: '土地見積',
  provisional_survey: '仮測量',
  confirmed_survey: '確定測量',
  subdivision_survey: '分筆測量',
  other_survey: 'その他測量',
  consult_survey: 'コンサル測量',
  land_registration: '土地登記',
  building_registration: '建物登記',
  farmland_conversion: '農地転用',
  donation_revert: '寄付帰属',
};

export const rewardSectionLabels: Record<RewardSection, string> = {
  investigation: '調査業務',
  survey: '測量業務',
  application: '申請手続業務',
  document: '書類作成等',
};

export const siteVisitAppliedToLabels: Record<SiteVisitRequest['appliedTo'], string> = {
  nagoya_city: '名古屋市',
  kita_nagoya_city: '北名古屋市',
  aichi_pref: '愛知県',
  other: 'その他',
};

export const calendarEventTypeLabels: Record<CalendarEventType, string> = {
  site_visit: '立会',
  field_survey: '現地調査',
  client_visit: '訪問',
  office_work: '社内作業',
};

export const calendarEventStatusLabels: Record<CalendarEventStatus, string> = {
  scheduled: '予定',
  done: '実施済み',
  cancelled: '中止',
};
