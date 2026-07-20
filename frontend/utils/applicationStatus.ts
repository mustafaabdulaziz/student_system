import { ApplicationStatus } from '../types';

const fold = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');

/** Legacy and alias values mapped to canonical ApplicationStatus strings. */
const STATUS_ALIASES: Record<string, ApplicationStatus> = {
  draft: ApplicationStatus.NEW,
  taslak: ApplicationStatus.NEW,
  yeni: ApplicationStatus.NEW,
  'yeni basvuru': ApplicationStatus.NEW,
  'to be applied': ApplicationStatus.TO_BE_APPLIED,
  basvurulacak: ApplicationStatus.TO_BE_APPLIED,
  applied: ApplicationStatus.APPLIED,
  basvuruldu: ApplicationStatus.APPLIED,
  rejected: ApplicationStatus.REJECTED,
  reddedildi: ApplicationStatus.REJECTED,
  'red edildi': ApplicationStatus.REJECTED,
  'baska acenta uzerinden kayitli': ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY,
  'baska agenta uzerinden kayitli': ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY,
  'eksik belgeler iste': ApplicationStatus.MISSING_DOCS,
  'eksik evrak': ApplicationStatus.MISSING_DOCS,
  'kota dolu': ApplicationStatus.QUOTA_FULL,
  'kota ful': ApplicationStatus.QUOTA_FULL,
  'under review': ApplicationStatus.OFFER_LETTER_WAITING,
  underreview: ApplicationStatus.OFFER_LETTER_WAITING,
  'teklif mektubu bekleniyor': ApplicationStatus.OFFER_LETTER_WAITING,
  "teklif mektubu gonderilmesi bekleniyor (firma'ya)": ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING,
  "teklif mektubu firma'ya gonderilmesi bekleniyor": ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING,
  'depozito odemesi bekleniyor': ApplicationStatus.DEPOSIT_PAYMENT_WAITING,
  'depoziti odemesi bekleniyor': ApplicationStatus.DEPOSIT_PAYMENT_WAITING,
  'depozito odemesi sisteme yuklenmesi bekleniyor': ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING,
  'kabul mektubu bekleniyor': ApplicationStatus.ACCEPTANCE_LETTER_WAITING,
  'kabul metubu bekleniyor': ApplicationStatus.ACCEPTANCE_LETTER_WAITING,
  "kabul mektubu gonderilmesi bekleniyor (firma'ya)": ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING,
  "kabul metubu firma'ya gonderilmesi bekleniyor": ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING,
  'ogrenci belgesi bekleniyor': ApplicationStatus.STUDENT_DOCUMENT_WAITING,
  'ogrenci belgesi teslim edildi': ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  'ogrenci belgesi telim edildi': ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  'ogrenci karti bekleniyor': ApplicationStatus.STUDENT_CARD_WAITING,
  'yillik odemesi tamamlamasi bekleniyor': ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
  'yillik odemesi dekonto bekleniyor': ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
  'universite muhasebe listesinde onaylanmasi bekleniyor': ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING,
  'depozito iade formu dolduruldu': ApplicationStatus.DEPOSIT_REFUND_FORM_COMPLETED,
  'depozito iadesi hesaba yatirildi': ApplicationStatus.DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT,
  'depozito iadesi heaaba yatirildi': ApplicationStatus.DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT,
  'depozito iadesi firmaya teslim edildi': ApplicationStatus.DEPOSIT_REFUND_DELIVERED_TO_COMPANY,
  'kayit bekleniyor': ApplicationStatus.SCHOOL_REGISTRATION_APPROVED,
  onaylandi: ApplicationStatus.COMPLETED,
  approved: ApplicationStatus.COMPLETED,
  accepted: ApplicationStatus.COMPLETED,
};

const CANONICAL_SET = new Set<string>(Object.values(ApplicationStatus));

const AGENT_VISIBLE_STATUS_MAP: Partial<Record<ApplicationStatus, ApplicationStatus | null>> = {
  [ApplicationStatus.NEW]: ApplicationStatus.NEW,
  [ApplicationStatus.OFFER_LETTER_WAITING]: ApplicationStatus.OFFER_LETTER_WAITING,
  [ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING]: ApplicationStatus.OFFER_LETTER_WAITING,
  [ApplicationStatus.DEPOSIT_PAYMENT_WAITING]: ApplicationStatus.DEPOSIT_PAYMENT_WAITING,
  [ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING]: ApplicationStatus.DEPOSIT_PAYMENT_WAITING,
  [ApplicationStatus.ACCEPTANCE_LETTER_WAITING]: ApplicationStatus.ACCEPTANCE_LETTER_WAITING,
  [ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING]: ApplicationStatus.ACCEPTANCE_LETTER_WAITING,
  [ApplicationStatus.STUDENT_DOCUMENT_WAITING]: ApplicationStatus.STUDENT_DOCUMENT_WAITING,
  [ApplicationStatus.STUDENT_DOCUMENT_DELIVERED]: ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  [ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING]: ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  [ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING]: ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  [ApplicationStatus.COMPLETED]: ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  [ApplicationStatus.REJECTED]: ApplicationStatus.REJECTED,
  [ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY]: ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY,
  [ApplicationStatus.MISSING_DOCS]: ApplicationStatus.MISSING_DOCS,
  [ApplicationStatus.QUOTA_FULL]: ApplicationStatus.QUOTA_FULL,
  [ApplicationStatus.PAYMENT_REJECTED]: ApplicationStatus.PAYMENT_REJECTED,
  [ApplicationStatus.DEPOSIT_REFUND_FORM_COMPLETED]: ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  [ApplicationStatus.DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT]: ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  [ApplicationStatus.DEPOSIT_REFUND_DELIVERED_TO_COMPANY]: ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
};

export function normalizeApplicationStatus(status: string | undefined | null): ApplicationStatus | string {
  const raw = String(status || '').trim();
  if (!raw) return ApplicationStatus.NEW;
  if (CANONICAL_SET.has(raw)) return raw as ApplicationStatus;
  const alias = STATUS_ALIASES[fold(raw)];
  if (alias) return alias;
  return raw;
}

export const APPLICATION_STATUS_EN: Record<ApplicationStatus, string> = {
  [ApplicationStatus.NEW]: 'New Application',
  [ApplicationStatus.TO_BE_APPLIED]: 'To be applied',
  [ApplicationStatus.APPLIED]: 'Applied',
  [ApplicationStatus.REJECTED]: 'Rejected',
  [ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY]: 'Registered via another agent',
  [ApplicationStatus.MISSING_DOCS]: 'Missing documents',
  [ApplicationStatus.QUOTA_FULL]: 'Quota full',
  [ApplicationStatus.OFFER_LETTER_WAITING]: 'Offer letter pending',
  [ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING]: 'Offer letter send pending (company)',
  [ApplicationStatus.OFFER_LETTER_UPLOADED]: 'Offer letter uploaded',
  [ApplicationStatus.DEPOSIT_PAYMENT_WAITING]: 'Deposit payment pending',
  [ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING]: 'Deposit payment upload pending',
  [ApplicationStatus.DEPOSIT_PAID]: 'Deposit paid',
  [ApplicationStatus.PAYMENT_REJECTED]: 'Payment rejected',
  [ApplicationStatus.PAYMENT_REUPLOADED]: 'Payment re-uploaded',
  [ApplicationStatus.ACCEPTANCE_LETTER_WAITING]: 'Acceptance letter pending',
  [ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING]: 'Acceptance letter send pending (company)',
  [ApplicationStatus.ACCEPTANCE_LETTER_UPLOADED]: 'Acceptance letter uploaded',
  [ApplicationStatus.STUDENT_DOCUMENT_WAITING]: 'Student document pending',
  [ApplicationStatus.STUDENT_DOCUMENT_DELIVERED]: 'Student document delivered',
  [ApplicationStatus.STUDENT_CARD_WAITING]: 'Student card pending',
  [ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING]: 'Annual payment receipt pending',
  [ApplicationStatus.ANNUAL_PAYMENT_RECEIVED_BY_SCHOOL]: 'Annual payment received by school',
  [ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING]: 'University accounting list approval pending',
  [ApplicationStatus.DEPOSIT_REFUND_APPLIED]: 'Deposit refund requested',
  [ApplicationStatus.DEPOSIT_REFUND_FORM_COMPLETED]: 'Deposit refund form completed',
  [ApplicationStatus.DEPOSIT_REFUND_WAITING]: 'Deposit refund pending',
  [ApplicationStatus.DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT]: 'Deposit refund deposited to account',
  [ApplicationStatus.DEPOSIT_REFUND_DELIVERED_TO_COMPANY]: 'Deposit refund delivered to company',
  [ApplicationStatus.SCHOOL_REGISTRATION_APPROVED]: 'Approved on school registration list',
  [ApplicationStatus.SCHOOL_PAYMENT_DONE]: 'School payment done',
  [ApplicationStatus.COMPLETED]: 'Completed',
};

export const APPLICATION_STATUS_AR: Record<ApplicationStatus, string> = {
  [ApplicationStatus.NEW]: 'طلب جديد',
  [ApplicationStatus.TO_BE_APPLIED]: 'سيتم التقديم',
  [ApplicationStatus.APPLIED]: 'تم التقديم',
  [ApplicationStatus.REJECTED]: 'مرفوض',
  [ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY]: 'مسجل عبر وكيل آخر',
  [ApplicationStatus.MISSING_DOCS]: 'مستندات ناقصة',
  [ApplicationStatus.QUOTA_FULL]: 'الحصة ممتلئة',
  [ApplicationStatus.OFFER_LETTER_WAITING]: 'بانتظار خطاب العرض',
  [ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING]: 'بانتظار إرسال خطاب العرض (للشركة)',
  [ApplicationStatus.OFFER_LETTER_UPLOADED]: 'تم رفع خطاب العرض',
  [ApplicationStatus.DEPOSIT_PAYMENT_WAITING]: 'بانتظار دفع العربون',
  [ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING]: 'بانتظار رفع دفعة العربون إلى النظام',
  [ApplicationStatus.DEPOSIT_PAID]: 'تم دفع العربون',
  [ApplicationStatus.PAYMENT_REJECTED]: 'تم رفض الدفع',
  [ApplicationStatus.PAYMENT_REUPLOADED]: 'تم إعادة رفع الدفع',
  [ApplicationStatus.ACCEPTANCE_LETTER_WAITING]: 'بانتظار خطاب القبول',
  [ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING]: 'بانتظار إرسال خطاب القبول (للشركة)',
  [ApplicationStatus.ACCEPTANCE_LETTER_UPLOADED]: 'تم رفع خطاب القبول',
  [ApplicationStatus.STUDENT_DOCUMENT_WAITING]: 'بانتظار وثيقة الطالب',
  [ApplicationStatus.STUDENT_DOCUMENT_DELIVERED]: 'تم تسليم وثيقة الطالب',
  [ApplicationStatus.STUDENT_CARD_WAITING]: 'بانتظار بطاقة الطالب',
  [ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING]: 'بانتظار إيصال الدفع السنوي',
  [ApplicationStatus.ANNUAL_PAYMENT_RECEIVED_BY_SCHOOL]: 'وصل الدفع السنوي لحساب المدرسة',
  [ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING]: 'بانتظار الاعتماد في قائمة محاسبة الجامعة',
  [ApplicationStatus.DEPOSIT_REFUND_APPLIED]: 'تم طلب استرداد العربون',
  [ApplicationStatus.DEPOSIT_REFUND_FORM_COMPLETED]: 'تم تعبئة نموذج استرداد العربون',
  [ApplicationStatus.DEPOSIT_REFUND_WAITING]: 'بانتظار وصول استرداد العربون',
  [ApplicationStatus.DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT]: 'تم إيداع استرداد العربون في الحساب',
  [ApplicationStatus.DEPOSIT_REFUND_DELIVERED_TO_COMPANY]: 'تم تسليم استرداد العربون للشركة',
  [ApplicationStatus.SCHOOL_REGISTRATION_APPROVED]: 'معتمد في قائمة تسجيل المدرسة',
  [ApplicationStatus.SCHOOL_PAYMENT_DONE]: 'تم دفع المدرسة',
  [ApplicationStatus.COMPLETED]: 'مكتمل',
};

export function translateApplicationStatus(status: string, language: string, viewerRole?: string): string {
  const canonical = normalizeApplicationStatus(status);
  const normalizedRole = (viewerRole || '').toString().toLowerCase();
  const effectiveStatus =
    normalizedRole === 'agent'
      ? AGENT_VISIBLE_STATUS_MAP[canonical as ApplicationStatus] ?? null
      : canonical;
  if (!effectiveStatus) return '';
  if (language === 'en' && effectiveStatus in APPLICATION_STATUS_EN) {
    return APPLICATION_STATUS_EN[effectiveStatus as ApplicationStatus];
  }
  if (language === 'ar' && effectiveStatus in APPLICATION_STATUS_AR) {
    return APPLICATION_STATUS_AR[effectiveStatus as ApplicationStatus];
  }
  return String(effectiveStatus);
}

/** Canonical pipeline order for milestone counts (status and all later stages). */
export const APPLICATION_STATUS_PIPELINE: ApplicationStatus[] = [
  ApplicationStatus.NEW,
  ApplicationStatus.TO_BE_APPLIED,
  ApplicationStatus.APPLIED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY,
  ApplicationStatus.MISSING_DOCS,
  ApplicationStatus.QUOTA_FULL,
  ApplicationStatus.OFFER_LETTER_WAITING,
  ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING,
  ApplicationStatus.OFFER_LETTER_UPLOADED,
  ApplicationStatus.DEPOSIT_PAYMENT_WAITING,
  ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING,
  ApplicationStatus.DEPOSIT_PAID,
  ApplicationStatus.PAYMENT_REJECTED,
  ApplicationStatus.PAYMENT_REUPLOADED,
  ApplicationStatus.ACCEPTANCE_LETTER_WAITING,
  ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING,
  ApplicationStatus.ACCEPTANCE_LETTER_UPLOADED,
  ApplicationStatus.STUDENT_DOCUMENT_WAITING,
  ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  ApplicationStatus.STUDENT_CARD_WAITING,
  ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
  ApplicationStatus.ANNUAL_PAYMENT_RECEIVED_BY_SCHOOL,
  ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING,
  ApplicationStatus.DEPOSIT_REFUND_APPLIED,
  ApplicationStatus.DEPOSIT_REFUND_FORM_COMPLETED,
  ApplicationStatus.DEPOSIT_REFUND_WAITING,
  ApplicationStatus.DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT,
  ApplicationStatus.DEPOSIT_REFUND_DELIVERED_TO_COMPANY,
  ApplicationStatus.SCHOOL_REGISTRATION_APPROVED,
  ApplicationStatus.SCHOOL_PAYMENT_DONE,
  ApplicationStatus.COMPLETED,
];

const PIPELINE_INDEX = new Map(
  APPLICATION_STATUS_PIPELINE.map((status, index) => [status, index])
);

export function isApplicationStatusAtOrAfter(
  status: string | undefined | null,
  threshold: ApplicationStatus
): boolean {
  const canonical = normalizeApplicationStatus(status);
  const idx = PIPELINE_INDEX.get(canonical as ApplicationStatus);
  const thresholdIdx = PIPELINE_INDEX.get(threshold);
  if (idx === undefined || thresholdIdx === undefined) return false;
  return idx >= thresholdIdx;
}
