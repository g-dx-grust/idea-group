import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { calculateRewardDetailAmount, calculateRewardTotals } from './rewards';
import {
  businessTypes,
  calendarEventStatuses,
  calendarEventTypes,
  caseStatuses,
  rewardSections,
  type AuditLog,
  type BusinessType,
  type CalendarEvent,
  type CalendarEventStatus,
  type CalendarEventType,
  type CaseListFilters,
  type CaseRecord,
  type CaseStatus,
  type Client,
  type IdeaStore,
  type Land,
  type RewardDetail,
  type RewardRecord,
  type RewardSection,
  type SiteVisitRequest,
  type SurveyProgress,
  type TaxRounding,
  type UnitPrice,
  type User,
} from './types';

const storePath = path.join(process.cwd(), 'data', 'idea-store.json');

export async function getStore() {
  return loadStore();
}

export async function listCases(filters: CaseListFilters = {}) {
  const store = await loadStore();
  const q = filters.q?.trim().toLowerCase();

  return store.cases
    .filter((caseRow) => {
      if (filters.status && filters.status !== 'all' && caseRow.status !== filters.status) return false;
      if (filters.businessType && filters.businessType !== 'all' && !caseRow.businessTypes.includes(filters.businessType)) {
        return false;
      }
      if (filters.assignee && filters.assignee !== 'all') {
        if (filters.assignee === 'designer' && !caseRow.designerUserId) return false;
        if (filters.assignee === 'surveyor' && !caseRow.surveyorUserId) return false;
        if (filters.assignee === 'registrar' && !caseRow.registrarUserId) return false;
        if (
          filters.assignee === 'unassigned' &&
          (caseRow.designerUserId || caseRow.surveyorUserId || caseRow.registrarUserId)
        ) {
          return false;
        }
      }
      if (!q) return true;
      const client = store.clients.find((item) => item.id === caseRow.clientId);
      const haystack = [caseRow.jutakuNo, caseRow.title, caseRow.address, client?.name, caseRow.cadNo]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCase(caseId: string) {
  const store = await loadStore();
  return store.cases.find((caseRow) => caseRow.id === caseId) ?? null;
}

export async function getDashboard() {
  const store = await loadStore();
  const now = new Date();
  const inSevenDays = new Date(now);
  inSevenDays.setDate(now.getDate() + 7);

  const activeCases = store.cases.filter((caseRow) => !['closed', 'paid'].includes(caseRow.status));
  const overdue = activeCases.filter((caseRow) => caseRow.deadline && new Date(caseRow.deadline) < now);
  const upcoming = activeCases.filter((caseRow) => {
    if (!caseRow.deadline) return false;
    const deadline = new Date(caseRow.deadline);
    return deadline >= now && deadline <= inSevenDays;
  });
  const rewards = store.cases.flatMap((caseRow) => caseRow.rewards);
  const unpaidRewards = rewards.filter((reward) => reward.invoiceDate && !reward.paidDate);
  const unbilledRewards = rewards.filter((reward) => reward.estimateDate && !reward.invoiceDate);

  return {
    metrics: {
      inProgress: store.cases.filter((caseRow) => caseRow.status === 'in_progress').length,
      unbilled: unbilledRewards.length,
      unpaid: unpaidRewards.length,
      thisMonthCreated: store.cases.filter((caseRow) => isSameMonth(new Date(caseRow.createdAt), now)).length,
    },
    deadlines: [...overdue, ...upcoming].slice(0, 8),
    recentCases: [...store.cases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8),
    bySurveyor: countCasesByUser(activeCases, store.users, 'surveyorUserId'),
  };
}

export async function listCalendarEvents(filters: { startDate: string; endDate: string; userId?: string }) {
  const store = await loadStore();
  return store.calendarEvents
    .filter((event) => event.date >= filters.startDate && event.date <= filters.endDate)
    .filter((event) => !filters.userId || event.userId === filters.userId)
    .sort((a, b) => `${a.date}${a.startTime ?? ''}`.localeCompare(`${b.date}${b.startTime ?? ''}`));
}

export async function createCalendarEvent(input: {
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
  sourceType: CalendarEvent['sourceType'];
  sourceId?: string;
}) {
  const store = await loadStore();
  const caseRow = requireCase(store, input.caseId);
  requireUser(store, input.userId);
  const now = new Date().toISOString();
  const event: CalendarEvent = {
    id: randomUUID(),
    caseId: input.caseId,
    userId: input.userId,
    type: input.type,
    status: input.status,
    title: input.title.trim() || caseRow.title,
    date: input.date,
    startTime: emptyToUndefined(input.startTime),
    endTime: emptyToUndefined(input.endTime),
    location: emptyToUndefined(input.location) ?? caseRow.address,
    note: emptyToUndefined(input.note),
    sourceType: input.sourceType,
    sourceId: emptyToUndefined(input.sourceId),
    createdAt: now,
    updatedAt: now,
  };
  store.calendarEvents.unshift(event);
  touchCase(caseRow);
  store.auditLogs.unshift(createAudit('calendar_event', event.id, 'create', `${caseRow.jutakuNo}の訪問予定を作成しました。`));
  await saveStore(store);
  return event;
}

export async function createCase(input: {
  jutakuNo: string;
  cadNo?: string;
  title: string;
  address: string;
  clientId: string;
  clientContactName?: string;
  clientTel?: string;
  clientEmail?: string;
  designerUserId?: string;
  surveyorUserId?: string;
  registrarUserId?: string;
  businessTypes: BusinessType[];
  specialNote?: string;
  deadline?: string;
}) {
  const store = await loadStore();
  if (store.cases.some((caseRow) => caseRow.jutakuNo === input.jutakuNo)) {
    throw new Error('同じ受託番号の現場がすでに存在します。');
  }
  const now = new Date().toISOString();
  const caseRow: CaseRecord = {
    id: randomUUID(),
    jutakuNo: input.jutakuNo,
    cadNo: emptyToUndefined(input.cadNo),
    title: input.title,
    address: input.address,
    clientId: input.clientId,
    clientContactName: emptyToUndefined(input.clientContactName),
    clientTel: emptyToUndefined(input.clientTel),
    clientEmail: emptyToUndefined(input.clientEmail),
    designerUserId: emptyToUndefined(input.designerUserId),
    surveyorUserId: emptyToUndefined(input.surveyorUserId),
    registrarUserId: emptyToUndefined(input.registrarUserId),
    businessTypes: input.businessTypes.length > 0 ? input.businessTypes : ['confirmed_survey'],
    specialNote: emptyToUndefined(input.specialNote),
    status: 'in_progress',
    deadline: emptyToUndefined(input.deadline),
    confirmedSurvey: {},
    subdivisionSurvey: {},
    lands: [],
    siteVisits: [],
    rewards: [],
    createdAt: now,
    updatedAt: now,
  };
  store.cases.unshift(caseRow);
  store.auditLogs.unshift(createAudit('case', caseRow.id, 'create', `${caseRow.jutakuNo}を作成しました。`));
  await saveStore(store);
  return caseRow;
}

export async function updateCaseSummary(caseId: string, input: {
  status: CaseStatus;
  deadline?: string;
  specialNote?: string;
  folderPath?: string;
  boxNoDesign?: string;
  boxNoSurvey?: string;
  boxNoRegTohshin?: string;
  boxNoRegOther?: string;
}) {
  const store = await loadStore();
  const caseRow = requireCase(store, caseId);
  caseRow.status = input.status;
  caseRow.deadline = emptyToUndefined(input.deadline);
  caseRow.specialNote = emptyToUndefined(input.specialNote);
  caseRow.folderPath = emptyToUndefined(input.folderPath);
  caseRow.boxNoDesign = emptyToUndefined(input.boxNoDesign);
  caseRow.boxNoSurvey = emptyToUndefined(input.boxNoSurvey);
  caseRow.boxNoRegTohshin = emptyToUndefined(input.boxNoRegTohshin);
  caseRow.boxNoRegOther = emptyToUndefined(input.boxNoRegOther);
  touchCase(caseRow);
  store.auditLogs.unshift(createAudit('case', caseId, 'update', `${caseRow.jutakuNo}の基本情報を更新しました。`));
  await saveStore(store);
}

export async function updateSurveyProgress(caseId: string, surveyType: 'confirmedSurvey' | 'subdivisionSurvey', input: SurveyProgress) {
  const store = await loadStore();
  const caseRow = requireCase(store, caseId);
  caseRow[surveyType] = {
    acceptedDate: emptyToUndefined(input.acceptedDate),
    scheduleOrDecided: input.scheduleOrDecided,
    houmuInvestDate: emptyToUndefined(input.houmuInvestDate),
    cityInvestDate: emptyToUndefined(input.cityInvestDate),
    hasSeirizuBrowse: input.hasSeirizuBrowse ?? false,
    seirizuBrowseDate: emptyToUndefined(input.seirizuBrowseDate),
    stampRequestDate: emptyToUndefined(input.stampRequestDate),
    stampReturnDate: emptyToUndefined(input.stampReturnDate),
    neighborSendDate: emptyToUndefined(input.neighborSendDate),
    siteVisitSendDate: emptyToUndefined(input.siteVisitSendDate),
    officialApplicationDate: emptyToUndefined(input.officialApplicationDate),
    officialMeetingDate: emptyToUndefined(input.officialMeetingDate),
    certRequestDate: emptyToUndefined(input.certRequestDate),
    certStampRequestDate: emptyToUndefined(input.certStampRequestDate),
    certSubmittedDate: emptyToUndefined(input.certSubmittedDate),
    certReturnDate: emptyToUndefined(input.certReturnDate),
    certCollectedDate: emptyToUndefined(input.certCollectedDate),
    completedDate: emptyToUndefined(input.completedDate),
  };
  touchCase(caseRow);
  store.auditLogs.unshift(createAudit('case', caseId, 'update', `${caseRow.jutakuNo}の工程を更新しました。`));
  await saveStore(store);
}

export async function addLand(caseId: string, input: {
  fudoNo?: string;
  address: string;
  chiban: string;
  edaban?: string;
  chimoku?: string;
  chiseki?: number;
  inputDate?: string;
  ownerName?: string;
  ownerAddress?: string;
  ownerShare?: string;
  ownerPostalCode?: string;
  ownerTel?: string;
}) {
  const store = await loadStore();
  const caseRow = requireCase(store, caseId);
  const land: Land = {
    id: randomUUID(),
    fudoNo: emptyToUndefined(input.fudoNo),
    address: input.address,
    chiban: input.chiban,
    edaban: emptyToUndefined(input.edaban),
    chimoku: emptyToUndefined(input.chimoku),
    chiseki: input.chiseki,
    inputDate: emptyToUndefined(input.inputDate) ?? new Date().toISOString().slice(0, 10),
    owners: input.ownerName
      ? [
          {
            id: randomUUID(),
            name: input.ownerName,
            address: input.ownerAddress ?? '',
            share: emptyToUndefined(input.ownerShare),
            postalCode: emptyToUndefined(input.ownerPostalCode),
            tel: emptyToUndefined(input.ownerTel),
          },
        ]
      : [],
  };
  caseRow.lands.push(land);
  touchCase(caseRow);
  store.auditLogs.unshift(createAudit('land', land.id, 'create', `${caseRow.jutakuNo}に土地を追加しました。`));
  await saveStore(store);
  return land;
}

export async function updateLand(caseId: string, landId: string, input: {
  fudoNo?: string;
  address: string;
  chiban: string;
  edaban?: string;
  chimoku?: string;
  chiseki?: number;
  inputDate?: string;
  ownerName?: string;
  ownerAddress?: string;
  ownerShare?: string;
  ownerPostalCode?: string;
  ownerTel?: string;
}) {
  const store = await loadStore();
  const caseRow = requireCase(store, caseId);
  const land = caseRow.lands.find((item) => item.id === landId);
  if (!land) throw new Error('対象の土地が見つかりません。');
  land.fudoNo = emptyToUndefined(input.fudoNo);
  land.address = input.address;
  land.chiban = input.chiban;
  land.edaban = emptyToUndefined(input.edaban);
  land.chimoku = emptyToUndefined(input.chimoku);
  land.chiseki = input.chiseki;
  land.inputDate = emptyToUndefined(input.inputDate) ?? land.inputDate;
  if (input.ownerName) {
    const existing = land.owners[0];
    if (existing) {
      existing.name = input.ownerName;
      existing.address = input.ownerAddress ?? '';
      existing.share = emptyToUndefined(input.ownerShare);
      existing.postalCode = emptyToUndefined(input.ownerPostalCode);
      existing.tel = emptyToUndefined(input.ownerTel);
      land.owners = [existing, ...land.owners.slice(1)];
    } else {
      land.owners = [{
        id: randomUUID(),
        name: input.ownerName,
        address: input.ownerAddress ?? '',
        share: emptyToUndefined(input.ownerShare),
        postalCode: emptyToUndefined(input.ownerPostalCode),
        tel: emptyToUndefined(input.ownerTel),
      }];
    }
  } else {
    land.owners = [];
  }
  touchCase(caseRow);
  store.auditLogs.unshift(createAudit('land', land.id, 'update', `${caseRow.jutakuNo}の土地を更新しました。`));
  await saveStore(store);
  return land;
}

export async function addSiteVisit(caseId: string, input: {
  appliedTo: SiteVisitRequest['appliedTo'];
  appliedToName?: string;
  surveyorUserId: string;
  houmuInvestDate?: string;
  routeNames: string[];
  landIds: string[];
  sortMode?: SiteVisitRequest['sortMode'];
  note?: string;
}) {
  const store = await loadStore();
  const caseRow = requireCase(store, caseId);
  const siteVisit: SiteVisitRequest = {
    id: randomUUID(),
    appliedTo: input.appliedTo,
    appliedToName: emptyToUndefined(input.appliedToName),
    surveyorUserId: input.surveyorUserId,
    houmuInvestDate: emptyToUndefined(input.houmuInvestDate),
    inputDate: new Date().toISOString().slice(0, 10),
    routeNames: input.routeNames.filter(Boolean),
    landIds: input.landIds,
    note: emptyToUndefined(input.note),
    sortMode: input.sortMode ?? 'input',
    generatedDocumentCount: 0,
  };
  caseRow.siteVisits.push(siteVisit);
  touchCase(caseRow);
  store.auditLogs.unshift(createAudit('site_visit', siteVisit.id, 'create', `${caseRow.jutakuNo}に立会申請を追加しました。`));
  await saveStore(store);
  return siteVisit;
}

export async function saveReward(caseId: string, input: {
  rewardId?: string;
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
  adjustAmount: number;
  miscExpense: number;
  stampCost: number;
  taxRate: number;
  taxRounding: TaxRounding;
  details: Array<Omit<RewardDetail, 'id' | 'amount'> & { id?: string }>;
  note?: string;
}) {
  const store = await loadStore();
  const caseRow = requireCase(store, caseId);
  const now = new Date().toISOString();
  const details: RewardDetail[] = input.details
    .filter((detail) => detail.itemName.trim())
    .map((detail) => {
      const base = {
        id: detail.id ?? randomUUID(),
        section: detail.section,
        itemName: detail.itemName.trim(),
        unitPrice: detail.unitPrice,
        quantity: detail.quantity,
        unit: detail.unit,
        rate: detail.rate,
      };
      return {
        ...base,
        amount: calculateRewardDetailAmount(base),
      };
    });
  const totals = calculateRewardTotals({
    details,
    adjustAmount: input.adjustAmount,
    miscExpense: input.miscExpense,
    stampCost: input.stampCost,
    taxRate: input.taxRate,
    taxRounding: input.taxRounding,
  });

  const existing = input.rewardId ? caseRow.rewards.find((reward) => reward.id === input.rewardId) : undefined;
  const reward: RewardRecord = {
    id: existing?.id ?? randomUUID(),
    businessName: input.businessName,
    address: input.address,
    recipientName: input.recipientName,
    formVersion: input.formVersion,
    estimateDate: emptyToUndefined(input.estimateDate),
    invoiceDate: emptyToUndefined(input.invoiceDate),
    paidDate: emptyToUndefined(input.paidDate),
    receiptDate: emptyToUndefined(input.receiptDate),
    receiptSentDate: emptyToUndefined(input.receiptSentDate),
    requireSend: input.requireSend,
    taxRate: input.taxRate,
    taxRounding: input.taxRounding,
    details,
    note: emptyToUndefined(input.note),
    ...totals,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    caseRow.rewards = caseRow.rewards.map((item) => (item.id === reward.id ? reward : item));
  } else {
    caseRow.rewards.push(reward);
  }
  if (reward.paidDate) {
    caseRow.status = 'paid';
  } else if (reward.invoiceDate) {
    caseRow.status = 'invoiced';
  }
  touchCase(caseRow);
  store.auditLogs.unshift(createAudit('reward', reward.id, existing ? 'update' : 'create', `${caseRow.jutakuNo}の報酬額計算書を保存しました。`));
  await saveStore(store);
  return reward;
}

export async function getPrintableCases(filters: CaseListFilters = {}) {
  const [store, cases] = await Promise.all([loadStore(), listCases(filters)]);
  return cases.map((caseRow) => ({
    ...caseRow,
    client: store.clients.find((client) => client.id === caseRow.clientId),
    designer: store.users.find((user) => user.id === caseRow.designerUserId),
    surveyor: store.users.find((user) => user.id === caseRow.surveyorUserId),
    registrar: store.users.find((user) => user.id === caseRow.registrarUserId),
  }));
}

export function isBusinessType(value: string): value is BusinessType {
  return businessTypes.includes(value as BusinessType);
}

export function isCaseStatus(value: string): value is CaseStatus {
  return caseStatuses.includes(value as CaseStatus);
}

export function isRewardSection(value: string): value is RewardSection {
  return rewardSections.includes(value as RewardSection);
}

export function isCalendarEventType(value: string): value is CalendarEventType {
  return calendarEventTypes.includes(value as CalendarEventType);
}

export function isCalendarEventStatus(value: string): value is CalendarEventStatus {
  return calendarEventStatuses.includes(value as CalendarEventStatus);
}

async function loadStore(): Promise<IdeaStore> {
  try {
    const raw = await readFile(storePath, 'utf8');
    return normalizeStore(JSON.parse(raw) as IdeaStore);
  } catch {
    const seed = createSeedStore();
    await saveStore(seed);
    return seed;
  }
}

function normalizeStore(store: IdeaStore): IdeaStore {
  return {
    ...store,
    calendarEvents: Array.isArray(store.calendarEvents) && store.calendarEvents.length > 0 ? store.calendarEvents : buildInitialCalendarEvents(store),
  };
}

function buildInitialCalendarEvents(store: IdeaStore): CalendarEvent[] {
  return store.cases.flatMap((caseRow) =>
    caseRow.siteVisits.flatMap((siteVisit) => {
      if (!siteVisit.houmuInvestDate) return [];
      return [{
        id: `event-${siteVisit.id}`,
        caseId: caseRow.id,
        userId: siteVisit.surveyorUserId,
        type: 'field_survey' as const,
        status: 'done' as const,
        title: '法務局調査',
        date: siteVisit.houmuInvestDate,
        location: caseRow.address,
        note: siteVisit.note,
        sourceType: 'site_visit' as const,
        sourceId: siteVisit.id,
        createdAt: caseRow.createdAt,
        updatedAt: caseRow.updatedAt,
      }];
    })
  );
}

async function saveStore(store: IdeaStore) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function requireCase(store: IdeaStore, caseId: string) {
  const caseRow = store.cases.find((item) => item.id === caseId);
  if (!caseRow) throw new Error('対象の現場が見つかりません。');
  return caseRow;
}

function requireUser(store: IdeaStore, userId: string) {
  const user = store.users.find((item) => item.id === userId);
  if (!user) throw new Error('対象の担当者が見つかりません。');
  return user;
}

function touchCase(caseRow: CaseRecord) {
  caseRow.updatedAt = new Date().toISOString();
}

function createAudit(targetType: AuditLog['targetType'], targetId: string, action: string, message: string): AuditLog {
  return {
    id: randomUUID(),
    targetType,
    targetId,
    action,
    message,
    createdAt: new Date().toISOString(),
  };
}

function countCasesByUser(cases: CaseRecord[], users: User[], field: 'surveyorUserId') {
  return users
    .map((user) => ({
      user,
      count: cases.filter((caseRow) => caseRow[field] === user.id).length,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function emptyToUndefined(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function createSeedStore(): IdeaStore {
  const users: User[] = [
    { id: 'user-kato', name: '加藤 和彦', role: 'staff', department: '測量部' },
    { id: 'user-sato', name: '佐藤 恵一', role: 'staff', department: '登記部' },
    { id: 'user-oike', name: '大池 浩司', role: 'office', department: '事務' },
    { id: 'user-admin', name: '管理者', role: 'admin', department: '管理' },
  ];
  const clients: Client[] = [
    {
      id: 'client-sample',
      code: 'C-001',
      name: '株式会社サンプル不動産',
      address: '名古屋市中区栄三丁目15番1号',
      tel: '052-000-0001',
      fax: '052-000-0002',
      email: 'info@example.jp',
      contactName: '山田 太郎',
      paymentTerms: '月末締め翌月末払い',
    },
    {
      id: 'client-koide',
      code: 'C-003',
      name: '小出 恵子',
      address: '名古屋市中村区塩池町二丁目148番',
      tel: '052-000-0020',
      contactName: '小出 恵子',
    },
  ];
  const unitPrices: UnitPrice[] = [
    { id: 'unit-1', categoryCode: 'survey_confirmed', section: 'investigation', itemName: '公課証明', unitPrice: 1000, unit: '通' },
    { id: 'unit-2', categoryCode: 'survey_confirmed', section: 'investigation', itemName: '多角測量', unitPrice: 18900, unit: '筆' },
    { id: 'unit-3', categoryCode: 'survey_confirmed', section: 'survey', itemName: '境界標設置・移設', unitPrice: 11100, unit: '点' },
    { id: 'unit-4', categoryCode: 'survey_confirmed', section: 'document', itemName: '土地証明書・承諾書', unitPrice: 4800, unit: '通' },
    { id: 'unit-5', categoryCode: 'survey_confirmed', section: 'document', itemName: '土地成果図', unitPrice: 5000, unit: '通' },
  ];
  const rewardDetails: RewardDetail[] = [
    { id: 'detail-1', section: 'investigation', itemName: '公課証明', unitPrice: 1000, quantity: 7, unit: '通', rate: 100, amount: 7000 },
    { id: 'detail-2', section: 'investigation', itemName: '多角測量', unitPrice: 18900, quantity: 2, unit: '筆', rate: 100, amount: 37800 },
    { id: 'detail-3', section: 'survey', itemName: '境界標設置・移設', unitPrice: 11100, quantity: 4, unit: '点', rate: 90, amount: 39960 },
    { id: 'detail-4', section: 'document', itemName: '土地証明書・承諾書', unitPrice: 4800, quantity: 2, unit: '通', rate: 100, amount: 9600 },
    { id: 'detail-5', section: 'document', itemName: '土地成果図', unitPrice: 5000, quantity: 1, unit: '通', rate: 100, amount: 5000 },
  ];
  const rewardTotals = calculateRewardTotals({
    details: rewardDetails,
    adjustAmount: 0,
    miscExpense: 10000,
    stampCost: 5000,
    taxRate: 10,
    taxRounding: 'floor',
  });
  const now = new Date().toISOString();
  const cases: CaseRecord[] = [
    {
      id: 'case-26-0185',
      jutakuNo: '26-0185',
      cadNo: 'CAD-1042',
      title: '筆界確定測量業務',
      address: '名古屋市中村区塩池町二丁目148番',
      clientId: 'client-koide',
      clientContactName: '小出 恵子',
      clientTel: '052-000-0020',
      designerUserId: 'user-oike',
      surveyorUserId: 'user-kato',
      registrarUserId: 'user-sato',
      businessTypes: ['confirmed_survey', 'land_registration'],
      status: 'in_progress',
      deadline: '2026-05-20',
      folderPath: 'idea/26-0185',
      boxNoSurvey: '測-26-12',
      specialNote: '現地立会の日程調整中。',
      confirmedSurvey: {
        acceptedDate: '2026-04-01',
        houmuInvestDate: '2026-04-06',
        cityInvestDate: '2026-04-08',
        stampRequestDate: '2026-04-15',
        officialApplicationDate: '2026-04-22',
      },
      subdivisionSurvey: {},
      lands: [
        {
          id: 'land-1',
          address: '名古屋市中村区塩池町二丁目',
          chiban: '148',
          chimoku: '宅地',
          chiseki: 241,
          inputDate: '2026-04-06',
          owners: [{ id: 'owner-1', name: '小出 恵子', address: '名古屋市中村区塩池町二丁目148番', share: '全部' }],
        },
      ],
      siteVisits: [
        {
          id: 'site-visit-1',
          appliedTo: 'nagoya_city',
          surveyorUserId: 'user-kato',
          houmuInvestDate: '2026-04-06',
          inputDate: '2026-04-23',
          routeNames: ['市道塩池線'],
          landIds: ['land-1'],
          generatedDocumentCount: 0,
        },
      ],
      rewards: [
        {
          id: 'reward-1',
          businessName: '筆界確定測量業務',
          address: '名古屋市中村区塩池町二丁目148番',
          recipientName: '小出 恵子',
          formVersion: 'new',
          estimateDate: '2026-04-01',
          invoiceDate: '',
          requireSend: true,
          taxRate: 10,
          taxRounding: 'floor',
          details: rewardDetails,
          note: '地積更正登記は別途見積。',
          ...rewardTotals,
          createdAt: now,
          updatedAt: now,
        },
      ],
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'case-26-0148',
      jutakuNo: '26-0148',
      title: '土地登記申請業務',
      address: '名古屋市北区芦辺町三丁目',
      clientId: 'client-sample',
      clientContactName: '山田 太郎',
      surveyorUserId: 'user-kato',
      registrarUserId: 'user-sato',
      businessTypes: ['land_registration'],
      status: 'invoiced',
      deadline: '2026-05-02',
      confirmedSurvey: {},
      subdivisionSurvey: {},
      lands: [],
      siteVisits: [],
      rewards: [],
      createdAt: '2026-04-10T09:00:00.000Z',
      updatedAt: '2026-04-22T09:00:00.000Z',
    },
  ];
  return {
    users,
    clients,
    unitPrices,
    cases,
    calendarEvents: [
      {
        id: 'event-visit-1',
        caseId: 'case-26-0185',
        userId: 'user-kato',
        type: 'site_visit',
        status: 'scheduled',
        title: '現地立会',
        date: '2026-04-28',
        startTime: '10:00',
        endTime: '11:30',
        location: '名古屋市中村区塩池町二丁目148番',
        note: '所有者へ前日連絡。',
        sourceType: 'case',
        createdAt: now,
        updatedAt: now,
      },
    ],
    auditLogs: [
      createAudit('case', 'case-26-0185', 'seed', '初期データを作成しました。'),
      createAudit('case', 'case-26-0148', 'seed', '初期データを作成しました。'),
    ],
  };
}
