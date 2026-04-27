'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  createCalendarEvent,
  addLand,
  addSiteVisit,
  createCase,
  isCalendarEventStatus,
  isCalendarEventType,
  isBusinessType,
  isCaseStatus,
  isRewardSection,
  saveReward,
  updateCaseSummary,
  updateSurveyProgress,
} from './store';
import type { BusinessType, CalendarEventStatus, CalendarEventType, RewardSection, SiteVisitRequest, SiteVisitSortMode, SurveyScheduleStatus, TaxRounding } from './types';

const caseSchema = z.object({
  jutakuNo: z.string().min(1, '受託番号は必須です。'),
  cadNo: z.string().optional(),
  title: z.string().min(1, '件名は必須です。'),
  address: z.string().min(1, '所在は必須です。'),
  clientId: z.string().min(1, '依頼先は必須です。'),
  clientContactName: z.string().optional(),
  clientTel: z.string().optional(),
  clientEmail: z.string().optional(),
  designerUserId: z.string().optional(),
  surveyorUserId: z.string().optional(),
  registrarUserId: z.string().optional(),
  specialNote: z.string().optional(),
  deadline: z.string().optional(),
});

export async function createCaseAction(formData: FormData) {
  const parsed = caseSchema.parse(Object.fromEntries(formData));
  const businessTypeValues = formData.getAll('businessTypes').map(String).filter(isBusinessType);
  const caseRow = await createCase({
    ...parsed,
    businessTypes: businessTypeValues,
  });
  revalidatePath('/cases');
  redirect(`/cases/${caseRow.id}`);
}

export async function updateCaseSummaryAction(caseId: string, formData: FormData) {
  const statusValue = String(formData.get('status') ?? 'in_progress');
  await updateCaseSummary(caseId, {
    status: isCaseStatus(statusValue) ? statusValue : 'in_progress',
    deadline: stringValue(formData, 'deadline'),
    specialNote: stringValue(formData, 'specialNote'),
    folderPath: stringValue(formData, 'folderPath'),
    boxNoDesign: stringValue(formData, 'boxNoDesign'),
    boxNoSurvey: stringValue(formData, 'boxNoSurvey'),
    boxNoRegTohshin: stringValue(formData, 'boxNoRegTohshin'),
    boxNoRegOther: stringValue(formData, 'boxNoRegOther'),
  });
  revalidatePath(`/cases/${caseId}`);
}

export async function updateConfirmedSurveyAction(caseId: string, formData: FormData) {
  await updateSurveyProgress(caseId, 'confirmedSurvey', readDateFields(formData));
  revalidatePath(`/cases/${caseId}`);
}

export async function updateSubdivisionSurveyAction(caseId: string, formData: FormData) {
  await updateSurveyProgress(caseId, 'subdivisionSurvey', readDateFields(formData));
  revalidatePath(`/cases/${caseId}`);
}

export async function addLandAction(caseId: string, formData: FormData) {
  await addLand(caseId, {
    fudoNo: stringValue(formData, 'fudoNo'),
    address: requiredString(formData, 'address'),
    chiban: requiredString(formData, 'chiban'),
    edaban: stringValue(formData, 'edaban'),
    chimoku: stringValue(formData, 'chimoku'),
    chiseki: numberValue(formData, 'chiseki'),
    inputDate: stringValue(formData, 'inputDate'),
    ownerName: stringValue(formData, 'ownerName'),
    ownerAddress: stringValue(formData, 'ownerAddress'),
    ownerShare: stringValue(formData, 'ownerShare'),
    ownerPostalCode: stringValue(formData, 'ownerPostalCode'),
    ownerTel: stringValue(formData, 'ownerTel'),
  });
  revalidatePath(`/cases/${caseId}`);
}

export async function addSiteVisitAction(caseId: string, formData: FormData) {
  const appliedTo = String(formData.get('appliedTo') ?? 'nagoya_city') as SiteVisitRequest['appliedTo'];
  await addSiteVisit(caseId, {
    appliedTo,
    appliedToName: stringValue(formData, 'appliedToName'),
    surveyorUserId: requiredString(formData, 'surveyorUserId'),
    houmuInvestDate: stringValue(formData, 'houmuInvestDate'),
    routeNames: ['route1', 'route2', 'route3', 'route4'].map((key) => stringValue(formData, key) ?? ''),
    landIds: formData.getAll('landIds').map(String),
    sortMode: readSiteVisitSortMode(formData),
    note: stringValue(formData, 'note'),
  });
  revalidatePath(`/cases/${caseId}`);
}

export async function addCaseCalendarEventAction(caseId: string, formData: FormData) {
  await createCalendarEvent({
    caseId,
    userId: requiredString(formData, 'userId'),
    type: readCalendarEventType(formData),
    status: readCalendarEventStatus(formData),
    title: stringValue(formData, 'title') ?? '訪問予定',
    date: requiredString(formData, 'date'),
    startTime: stringValue(formData, 'startTime'),
    endTime: stringValue(formData, 'endTime'),
    location: stringValue(formData, 'location'),
    note: stringValue(formData, 'note'),
    sourceType: 'case',
  });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/calendar');
}

export async function addCalendarEventAction(formData: FormData) {
  const caseId = requiredString(formData, 'caseId');
  await createCalendarEvent({
    caseId,
    userId: requiredString(formData, 'userId'),
    type: readCalendarEventType(formData),
    status: readCalendarEventStatus(formData),
    title: stringValue(formData, 'title') ?? '訪問予定',
    date: requiredString(formData, 'date'),
    startTime: stringValue(formData, 'startTime'),
    endTime: stringValue(formData, 'endTime'),
    location: stringValue(formData, 'location'),
    note: stringValue(formData, 'note'),
    sourceType: 'calendar',
  });
  revalidatePath('/calendar');
  revalidatePath(`/cases/${caseId}`);
}

export async function saveRewardAction(caseId: string, formData: FormData) {
  const sections = formData.getAll('detailSection').map(String);
  const ids = formData.getAll('detailId').map(String);
  const itemNames = formData.getAll('detailItemName').map(String);
  const unitPrices = formData.getAll('detailUnitPrice').map(String);
  const quantities = formData.getAll('detailQuantity').map(String);
  const units = formData.getAll('detailUnit').map(String);
  const rates = formData.getAll('detailRate').map(String);

  const details = itemNames.flatMap((itemName, index) => {
    const section = sections[index];
    if (!section || !isRewardSection(section) || !itemName.trim()) return [];
    const id = ids[index]?.trim();
    return [{
      ...(id ? { id } : {}),
      section: section as RewardSection,
      itemName,
      unitPrice: Number(unitPrices[index] ?? 0),
      quantity: Number(quantities[index] ?? 0),
      unit: units[index] ?? '式',
      rate: Number(rates[index] ?? 100),
    }];
  });

  await saveReward(caseId, {
    rewardId: stringValue(formData, 'rewardId'),
    businessName: requiredString(formData, 'businessName'),
    address: requiredString(formData, 'address'),
    recipientName: requiredString(formData, 'recipientName'),
    formVersion: String(formData.get('formVersion') ?? 'new') === 'old' ? 'old' : 'new',
    estimateDate: stringValue(formData, 'estimateDate'),
    invoiceDate: stringValue(formData, 'invoiceDate'),
    paidDate: stringValue(formData, 'paidDate'),
    receiptDate: stringValue(formData, 'receiptDate'),
    receiptSentDate: stringValue(formData, 'receiptSentDate'),
    requireSend: formData.get('requireSend') === 'on',
    adjustAmount: numberValue(formData, 'adjustAmount') ?? 0,
    miscExpense: numberValue(formData, 'miscExpense') ?? 0,
    stampCost: numberValue(formData, 'stampCost') ?? 0,
    taxRate: numberValue(formData, 'taxRate') ?? 10,
    taxRounding: (String(formData.get('taxRounding') ?? 'floor') === 'round' ? 'round' : 'floor') as TaxRounding,
    details,
    note: stringValue(formData, 'note'),
  });
  revalidatePath(`/cases/${caseId}`);
}

function readDateFields(formData: FormData) {
  return {
    acceptedDate: stringValue(formData, 'acceptedDate') ?? '',
    scheduleOrDecided: readSurveyScheduleStatus(formData),
    houmuInvestDate: stringValue(formData, 'houmuInvestDate') ?? '',
    cityInvestDate: stringValue(formData, 'cityInvestDate') ?? '',
    hasSeirizuBrowse: formData.get('hasSeirizuBrowse') === 'on',
    seirizuBrowseDate: stringValue(formData, 'seirizuBrowseDate') ?? '',
    stampRequestDate: stringValue(formData, 'stampRequestDate') ?? '',
    stampReturnDate: stringValue(formData, 'stampReturnDate') ?? '',
    neighborSendDate: stringValue(formData, 'neighborSendDate') ?? '',
    siteVisitSendDate: stringValue(formData, 'siteVisitSendDate') ?? '',
    officialApplicationDate: stringValue(formData, 'officialApplicationDate') ?? '',
    officialMeetingDate: stringValue(formData, 'officialMeetingDate') ?? '',
    certRequestDate: stringValue(formData, 'certRequestDate') ?? '',
    certStampRequestDate: stringValue(formData, 'certStampRequestDate') ?? '',
    certSubmittedDate: stringValue(formData, 'certSubmittedDate') ?? '',
    certReturnDate: stringValue(formData, 'certReturnDate') ?? '',
    certCollectedDate: stringValue(formData, 'certCollectedDate') ?? '',
    completedDate: stringValue(formData, 'completedDate') ?? '',
  };
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function requiredString(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function numberValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readCalendarEventType(formData: FormData): CalendarEventType {
  const value = String(formData.get('type') ?? 'site_visit');
  return isCalendarEventType(value) ? value : 'site_visit';
}

function readCalendarEventStatus(formData: FormData): CalendarEventStatus {
  const value = String(formData.get('status') ?? 'scheduled');
  return isCalendarEventStatus(value) ? value : 'scheduled';
}

function readSurveyScheduleStatus(formData: FormData): SurveyScheduleStatus {
  return String(formData.get('scheduleOrDecided') ?? 'scheduled') === 'decided' ? 'decided' : 'scheduled';
}

function readSiteVisitSortMode(formData: FormData): SiteVisitSortMode {
  return String(formData.get('sortMode') ?? 'input') === 'chiban' ? 'chiban' : 'input';
}
