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
  burslu: ApplicationStatus.SCHOLARSHIP,
  scholarship: ApplicationStatus.SCHOLARSHIP,
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
  "kabul mektubu firma'ya gonderilmesi bekleniyor": ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING,
  "kabul metubu firma'ya gonderilmesi bekleniyor": ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING,
  'ogrenci belgesi bekleniyor': ApplicationStatus.STUDENT_DOCUMENT_WAITING,
  'ogrenci belgesi teslim edildi': ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  'ogrenci belgesi telim edildi': ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  'yillik odemesi tamamlamasi bekleniyor': ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
  'yillik odemesi dekonto bekleniyor': ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
  'universite muhasebe listesinde onaylanmasi bekleniyor': ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING,
  'depozito iade formu dolduruldu': ApplicationStatus.DEPOSIT_REFUND_FORM_COMPLETED,
  'depozito iadesi hesaba yatirildi': ApplicationStatus.DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT,
  'depozito iadesi heaaba yatirildi': ApplicationStatus.DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT,
  'depozito iadesi firmaya teslim edildi': ApplicationStatus.DEPOSIT_REFUND_DELIVERED_TO_COMPANY,
  onaylandi: ApplicationStatus.COMPLETED,
  approved: ApplicationStatus.COMPLETED,
  accepted: ApplicationStatus.COMPLETED,
  // Removed statuses → nearest remaining canonical (legacy DB rows)
  'to be applied': ApplicationStatus.NEW,
  basvurulacak: ApplicationStatus.NEW,
  applied: ApplicationStatus.OFFER_LETTER_WAITING,
  basvuruldu: ApplicationStatus.OFFER_LETTER_WAITING,
  'teklif mektubu yuklendi': ApplicationStatus.OFFER_LETTER_WAITING,
  'depozito odemesi yapildi': ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING,
  'odeme yeniden yuklendi': ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING,
  'kabul mektubu yuklendi': ApplicationStatus.ACCEPTANCE_LETTER_WAITING,
  'ogrenci karti bekleniyor': ApplicationStatus.STUDENT_DOCUMENT_WAITING,
  'yillik odemesi okul hesabina gecti': ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
  'depozito iade basvurusu yapildi': ApplicationStatus.DEPOSIT_REFUND_FORM_COMPLETED,
  'depozito iadesi hesaba ulasmasi bekleniyor': ApplicationStatus.DEPOSIT_REFUND_FORM_COMPLETED,
  'kayit bekleniyor': ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING,
  'okul kayit listesinde onaylandi': ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING,
  'okul odemesi yapildi': ApplicationStatus.COMPLETED,
};

const CANONICAL_SET = new Set<string>(Object.values(ApplicationStatus));

const AGENT_VISIBLE_STATUS_MAP: Partial<Record<ApplicationStatus, ApplicationStatus | null>> = {
  [ApplicationStatus.NEW]: ApplicationStatus.NEW,
  [ApplicationStatus.SCHOLARSHIP]: ApplicationStatus.SCHOLARSHIP,
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
  [ApplicationStatus.SCHOLARSHIP]: 'Scholarship',
  [ApplicationStatus.REJECTED]: 'Rejected',
  [ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY]: 'Registered via another agent',
  [ApplicationStatus.MISSING_DOCS]: 'Missing documents',
  [ApplicationStatus.QUOTA_FULL]: 'Quota full',
  [ApplicationStatus.OFFER_LETTER_WAITING]: 'Offer letter pending',
  [ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING]: 'Offer letter send pending (company)',
  [ApplicationStatus.DEPOSIT_PAYMENT_WAITING]: 'Deposit payment pending',
  [ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING]: 'Deposit payment upload pending',
  [ApplicationStatus.PAYMENT_REJECTED]: 'Payment rejected',
  [ApplicationStatus.ACCEPTANCE_LETTER_WAITING]: 'Acceptance letter pending',
  [ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING]: 'Acceptance letter send pending (company)',
  [ApplicationStatus.STUDENT_DOCUMENT_WAITING]: 'Student document pending',
  [ApplicationStatus.STUDENT_DOCUMENT_DELIVERED]: 'Student document delivered',
  [ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING]: 'Annual payment receipt pending',
  [ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING]: 'University accounting list approval pending',
  [ApplicationStatus.DEPOSIT_REFUND_FORM_COMPLETED]: 'Deposit refund form completed',
  [ApplicationStatus.DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT]: 'Deposit refund deposited to account',
  [ApplicationStatus.DEPOSIT_REFUND_DELIVERED_TO_COMPANY]: 'Deposit refund delivered to company',
  [ApplicationStatus.COMPLETED]: 'Completed',
};

export const APPLICATION_STATUS_AR: Record<ApplicationStatus, string> = {
  [ApplicationStatus.NEW]: 'طلب جديد',
  [ApplicationStatus.SCHOLARSHIP]: 'منحة',
  [ApplicationStatus.REJECTED]: 'مرفوض',
  [ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY]: 'مسجل عبر وكيل آخر',
  [ApplicationStatus.MISSING_DOCS]: 'مستندات ناقصة',
  [ApplicationStatus.QUOTA_FULL]: 'الحصة ممتلئة',
  [ApplicationStatus.OFFER_LETTER_WAITING]: 'بانتظار خطاب العرض',
  [ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING]: 'بانتظار إرسال خطاب العرض (للشركة)',
  [ApplicationStatus.DEPOSIT_PAYMENT_WAITING]: 'بانتظار دفع العربون',
  [ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING]: 'بانتظار رفع دفعة العربون إلى النظام',
  [ApplicationStatus.PAYMENT_REJECTED]: 'تم رفض الدفع',
  [ApplicationStatus.ACCEPTANCE_LETTER_WAITING]: 'بانتظار خطاب القبول',
  [ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING]: 'بانتظار إرسال خطاب القبول (للشركة)',
  [ApplicationStatus.STUDENT_DOCUMENT_WAITING]: 'بانتظار وثيقة الطالب',
  [ApplicationStatus.STUDENT_DOCUMENT_DELIVERED]: 'تم تسليم وثيقة الطالب',
  [ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING]: 'بانتظار إيصال الدفع السنوي',
  [ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING]: 'بانتظار الاعتماد في قائمة محاسبة الجامعة',
  [ApplicationStatus.DEPOSIT_REFUND_FORM_COMPLETED]: 'تم تعبئة نموذج استرداد العربون',
  [ApplicationStatus.DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT]: 'تم إيداع استرداد العربون في الحساب',
  [ApplicationStatus.DEPOSIT_REFUND_DELIVERED_TO_COMPANY]: 'تم تسليم استرداد العربون للشركة',
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
  ApplicationStatus.REJECTED,
  ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY,
  ApplicationStatus.MISSING_DOCS,
  ApplicationStatus.QUOTA_FULL,
  ApplicationStatus.OFFER_LETTER_WAITING,
  ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING,
  ApplicationStatus.DEPOSIT_PAYMENT_WAITING,
  ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING,
  ApplicationStatus.PAYMENT_REJECTED,
  ApplicationStatus.ACCEPTANCE_LETTER_WAITING,
  ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING,
  ApplicationStatus.STUDENT_DOCUMENT_WAITING,
  ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
  ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING,
  ApplicationStatus.DEPOSIT_REFUND_FORM_COMPLETED,
  ApplicationStatus.DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT,
  ApplicationStatus.DEPOSIT_REFUND_DELIVERED_TO_COMPANY,
  ApplicationStatus.COMPLETED,
  ApplicationStatus.SCHOLARSHIP,
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
