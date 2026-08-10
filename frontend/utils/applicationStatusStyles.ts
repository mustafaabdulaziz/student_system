import { ApplicationStatus } from '../types';
import { normalizeApplicationStatus } from './applicationStatus';

const STATUS_COLORS: Partial<Record<ApplicationStatus, string>> = {
  [ApplicationStatus.NEW]: 'bg-slate-300 text-slate-900 border-slate-500 ring-slate-400',
  [ApplicationStatus.SCHOLARSHIP]: 'bg-amber-300 text-amber-950 border-amber-500 ring-amber-400',
  [ApplicationStatus.REJECTED]: 'bg-red-500 text-white border-red-700 ring-red-400',
  [ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY]: 'bg-purple-300 text-purple-950 border-purple-500 ring-purple-400',
  [ApplicationStatus.MISSING_DOCS]: 'bg-orange-300 text-orange-950 border-orange-500 ring-orange-400',
  [ApplicationStatus.QUOTA_FULL]: 'bg-orange-500 text-white border-orange-700 ring-orange-400',
  [ApplicationStatus.OFFER_LETTER_WAITING]: 'bg-sky-300 text-sky-950 border-sky-500 ring-sky-400',
  [ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING]: 'bg-sky-200 text-sky-950 border-sky-400 ring-sky-300',
  [ApplicationStatus.DEPOSIT_PAYMENT_WAITING]: 'bg-teal-200 text-teal-950 border-teal-400 ring-teal-300',
  [ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING]: 'bg-teal-200 text-teal-950 border-teal-500 ring-teal-300',
  [ApplicationStatus.PAYMENT_REJECTED]: 'bg-rose-500 text-white border-rose-700 ring-rose-400',
  [ApplicationStatus.ACCEPTANCE_LETTER_WAITING]: 'bg-indigo-300 text-indigo-950 border-indigo-500 ring-indigo-400',
  [ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING]: 'bg-indigo-200 text-indigo-950 border-indigo-400 ring-indigo-300',
  [ApplicationStatus.STUDENT_DOCUMENT_WAITING]: 'bg-fuchsia-200 text-fuchsia-950 border-fuchsia-400 ring-fuchsia-300',
  [ApplicationStatus.STUDENT_DOCUMENT_DELIVERED]: 'bg-fuchsia-300 text-fuchsia-950 border-fuchsia-500 ring-fuchsia-400',
  [ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING]: 'bg-amber-300 text-amber-950 border-amber-500 ring-amber-400',
  [ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING]: 'bg-lime-200 text-lime-950 border-lime-500 ring-lime-300',
  [ApplicationStatus.DEPOSIT_REFUND_FORM_COMPLETED]: 'bg-yellow-200 text-yellow-950 border-yellow-400 ring-yellow-300',
  [ApplicationStatus.DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT]: 'bg-emerald-200 text-emerald-950 border-emerald-400 ring-emerald-300',
  [ApplicationStatus.DEPOSIT_REFUND_DELIVERED_TO_COMPANY]: 'bg-emerald-300 text-emerald-950 border-emerald-500 ring-emerald-400',
  [ApplicationStatus.COMPLETED]: 'bg-emerald-500 text-white border-emerald-700 ring-emerald-400',
};

const DEFAULT_COLORS = 'bg-blue-300 text-blue-950 border-blue-500 ring-blue-400';

export type StatusBadgeSize = 'header' | 'default' | 'compact';

const SIZE_CLASSES: Record<StatusBadgeSize, string> = {
  header: 'px-4 py-1.5 rounded-full text-sm font-extrabold uppercase tracking-wide border-2 shadow-sm',
  default: 'px-4 py-1.5 rounded-full text-xs font-bold border-2 ring-2 ring-inset',
  compact: 'px-2.5 py-1 rounded-full text-[10px] font-bold border ring-1 ring-inset',
};

export function getApplicationStatusBadgeClass(
  status: ApplicationStatus | string,
  size: StatusBadgeSize = 'default'
): string {
  const canonical = normalizeApplicationStatus(status);
  const colors = STATUS_COLORS[canonical as ApplicationStatus] ?? DEFAULT_COLORS;
  return `${SIZE_CLASSES[size]} ${colors}`;
}
