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
  'kabul mektubu bekleniyor': ApplicationStatus.ACCEPTANCE_LETTER_WAITING,
  'kabul metubu bekleniyor': ApplicationStatus.ACCEPTANCE_LETTER_WAITING,
  'ogrenci belgesi bekleniyor': ApplicationStatus.STUDENT_CARD_WAITING,
  'ogrenci karti bekleniyor': ApplicationStatus.STUDENT_CARD_WAITING,
  'yillik odemesi tamamlamasi bekleniyor': ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
  'yillik odemesi dekonto bekleniyor': ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
  'kayit bekleniyor': ApplicationStatus.SCHOOL_REGISTRATION_APPROVED,
  onaylandi: ApplicationStatus.COMPLETED,
  approved: ApplicationStatus.COMPLETED,
  accepted: ApplicationStatus.COMPLETED,
};

const CANONICAL_SET = new Set<string>(Object.values(ApplicationStatus));

export function normalizeApplicationStatus(status: string | undefined | null): ApplicationStatus | string {
  const raw = String(status || '').trim();
  if (!raw) return ApplicationStatus.NEW;
  if (CANONICAL_SET.has(raw)) return raw as ApplicationStatus;
  const alias = STATUS_ALIASES[fold(raw)];
  if (alias) return alias;
  return raw;
}

export const APPLICATION_STATUS_EN: Record<ApplicationStatus, string> = {
  [ApplicationStatus.NEW]: 'New',
  [ApplicationStatus.TO_BE_APPLIED]: 'To be applied',
  [ApplicationStatus.APPLIED]: 'Applied',
  [ApplicationStatus.REJECTED]: 'Rejected',
  [ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY]: 'Registered via another agent',
  [ApplicationStatus.MISSING_DOCS]: 'Missing documents',
  [ApplicationStatus.QUOTA_FULL]: 'Quota full',
  [ApplicationStatus.OFFER_LETTER_WAITING]: 'Offer letter pending',
  [ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING]: 'Offer letter send pending (company)',
  [ApplicationStatus.OFFER_LETTER_UPLOADED]: 'Offer letter uploaded',
  [ApplicationStatus.DEPOSIT_PAID]: 'Deposit paid',
  [ApplicationStatus.PAYMENT_REJECTED]: 'Payment rejected',
  [ApplicationStatus.PAYMENT_REUPLOADED]: 'Payment re-uploaded',
  [ApplicationStatus.ACCEPTANCE_LETTER_WAITING]: 'Acceptance letter pending',
  [ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING]: 'Acceptance letter send pending (company)',
  [ApplicationStatus.ACCEPTANCE_LETTER_UPLOADED]: 'Acceptance letter uploaded',
  [ApplicationStatus.STUDENT_CARD_WAITING]: 'Student card pending',
  [ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING]: 'Annual payment receipt pending',
  [ApplicationStatus.ANNUAL_PAYMENT_RECEIVED_BY_SCHOOL]: 'Annual payment received by school',
  [ApplicationStatus.DEPOSIT_REFUND_APPLIED]: 'Deposit refund requested',
  [ApplicationStatus.DEPOSIT_REFUND_WAITING]: 'Deposit refund pending',
  [ApplicationStatus.SCHOOL_REGISTRATION_APPROVED]: 'Approved on school registration list',
  [ApplicationStatus.SCHOOL_PAYMENT_DONE]: 'School payment done',
  [ApplicationStatus.COMPLETED]: 'Completed',
};

export const APPLICATION_STATUS_AR: Record<ApplicationStatus, string> = {
  [ApplicationStatus.NEW]: 'جديد',
  [ApplicationStatus.TO_BE_APPLIED]: 'سيتم التقديم',
  [ApplicationStatus.APPLIED]: 'تم التقديم',
  [ApplicationStatus.REJECTED]: 'مرفوض',
  [ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY]: 'مسجل عبر وكيل آخر',
  [ApplicationStatus.MISSING_DOCS]: 'مستندات ناقصة',
  [ApplicationStatus.QUOTA_FULL]: 'الحصة ممتلئة',
  [ApplicationStatus.OFFER_LETTER_WAITING]: 'بانتظار خطاب العرض',
  [ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING]: 'بانتظار إرسال خطاب العرض (للشركة)',
  [ApplicationStatus.OFFER_LETTER_UPLOADED]: 'تم رفع خطاب العرض',
  [ApplicationStatus.DEPOSIT_PAID]: 'تم دفع العربون',
  [ApplicationStatus.PAYMENT_REJECTED]: 'تم رفض الدفع',
  [ApplicationStatus.PAYMENT_REUPLOADED]: 'تم إعادة رفع الدفع',
  [ApplicationStatus.ACCEPTANCE_LETTER_WAITING]: 'بانتظار خطاب القبول',
  [ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING]: 'بانتظار إرسال خطاب القبول (للشركة)',
  [ApplicationStatus.ACCEPTANCE_LETTER_UPLOADED]: 'تم رفع خطاب القبول',
  [ApplicationStatus.STUDENT_CARD_WAITING]: 'بانتظار بطاقة الطالب',
  [ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING]: 'بانتظار إيصال الدفع السنوي',
  [ApplicationStatus.ANNUAL_PAYMENT_RECEIVED_BY_SCHOOL]: 'وصل الدفع السنوي لحساب المدرسة',
  [ApplicationStatus.DEPOSIT_REFUND_APPLIED]: 'تم طلب استرداد العربون',
  [ApplicationStatus.DEPOSIT_REFUND_WAITING]: 'بانتظار وصول استرداد العربون',
  [ApplicationStatus.SCHOOL_REGISTRATION_APPROVED]: 'معتمد في قائمة تسجيل المدرسة',
  [ApplicationStatus.SCHOOL_PAYMENT_DONE]: 'تم دفع المدرسة',
  [ApplicationStatus.COMPLETED]: 'مكتمل',
};

export function translateApplicationStatus(status: string, language: string): string {
  const canonical = normalizeApplicationStatus(status);
  if (language === 'en' && canonical in APPLICATION_STATUS_EN) {
    return APPLICATION_STATUS_EN[canonical as ApplicationStatus];
  }
  if (language === 'ar' && canonical in APPLICATION_STATUS_AR) {
    return APPLICATION_STATUS_AR[canonical as ApplicationStatus];
  }
  return String(canonical);
}
