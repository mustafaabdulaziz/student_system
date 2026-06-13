import { ApplicationStatus } from '../types';

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.DRAFT]: 'bg-slate-300 text-slate-900 border-slate-500 ring-slate-400',
  [ApplicationStatus.MISSING_DOCS]: 'bg-orange-300 text-orange-950 border-orange-500 ring-orange-400',
  [ApplicationStatus.UNDER_REVIEW]: 'bg-blue-300 text-blue-950 border-blue-500 ring-blue-400',
  [ApplicationStatus.ACCEPTANCE_LETTER_WAITING]: 'bg-sky-300 text-sky-950 border-sky-500 ring-sky-400',
  [ApplicationStatus.STUDENT_CERT_WAITING]: 'bg-indigo-300 text-indigo-950 border-indigo-500 ring-indigo-400',
  [ApplicationStatus.ANNUAL_PAYMENT_WAITING]: 'bg-amber-300 text-amber-950 border-amber-500 ring-amber-400',
  [ApplicationStatus.REGISTRATION_WAITING]: 'bg-teal-300 text-teal-950 border-teal-500 ring-teal-400',
  [ApplicationStatus.REJECTED]: 'bg-red-500 text-white border-red-700 ring-red-400',
  [ApplicationStatus.REGISTERED_WITH_OTHER_AGENCY]: 'bg-purple-300 text-purple-950 border-purple-500 ring-purple-400',
  [ApplicationStatus.PAYMENT_REJECTED]: 'bg-rose-500 text-white border-rose-700 ring-rose-400',
  [ApplicationStatus.QUOTA_FULL]: 'bg-orange-500 text-white border-orange-700 ring-orange-400',
  [ApplicationStatus.ACCEPTED]: 'bg-emerald-500 text-white border-emerald-700 ring-emerald-400',
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
  const colors = STATUS_COLORS[status as ApplicationStatus] ?? DEFAULT_COLORS;
  return `${SIZE_CLASSES[size]} ${colors}`;
}
