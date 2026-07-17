export const OUTGOING_PAYMENT_REASONS = ['commission', 'debt', 'company_expense'] as const;
export type OutgoingPaymentReasonCode = (typeof OUTGOING_PAYMENT_REASONS)[number];

export const OUTGOING_PAYMENT_REASON_LABELS: Record<OutgoingPaymentReasonCode, string> = {
  commission: 'Komisyon',
  debt: 'Borç',
  company_expense: 'Firma masrafı',
};

export const COMPANY_EXPENSE_TYPES = [
  'salaries',
  'advertising',
  'cekeyim',
  'kira',
  'cashback',
  'deposit',
  'support',
  'other',
] as const;
export type CompanyExpenseTypeCode = (typeof COMPANY_EXPENSE_TYPES)[number];

export const COMPANY_EXPENSE_TYPE_LABELS: Record<CompanyExpenseTypeCode, string> = {
  salaries: 'Maaşlar',
  advertising: 'Reklam',
  cekeyim: 'Çekeyim',
  kira: 'Kira',
  cashback: 'Cashback',
  deposit: 'Depozito',
  support: 'Destek',
  other: 'Diğer',
};

/** Legacy expense codes still shown for old records */
const LEGACY_EXPENSE_TYPE_LABELS: Record<string, string> = {
  deposit_support: 'Depozito destek',
  rateb: 'Rateb',
  terwij: 'Terwij',
  ulasim: 'Ulasim',
  yemek: 'Yemek',
  others: 'Others',
};

export function formatOutgoingPaymentDisplay(reason: string | null | undefined): string {
  if (!reason) return '—';
  const label = OUTGOING_PAYMENT_REASON_LABELS[reason as OutgoingPaymentReasonCode];
  return label ?? reason;
}

export function formatExpenseTypeDisplay(expenseType: string | null | undefined): string {
  if (!expenseType) return '—';
  const label = COMPANY_EXPENSE_TYPE_LABELS[expenseType as CompanyExpenseTypeCode];
  if (label) return label;
  return LEGACY_EXPENSE_TYPE_LABELS[expenseType] ?? expenseType;
}

export const COMMISSION_SHAPES = [
  'agency_commission',
  'employee_commission',
  'student_referral_commission',
] as const;
export type CommissionShapeCode = (typeof COMMISSION_SHAPES)[number];

export const COMMISSION_SHAPE_LABELS: Record<CommissionShapeCode, string> = {
  agency_commission: 'Agenta komisyon',
  employee_commission: 'Çalışan komisyon',
  student_referral_commission: 'Öğrenci referans komisyon',
};

export function formatCommissionShapeDisplay(value: string | null | undefined): string {
  if (!value) return '—';
  const label = COMMISSION_SHAPE_LABELS[value as CommissionShapeCode];
  return label ?? value;
}
