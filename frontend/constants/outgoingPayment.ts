export const OUTGOING_PAYMENT_REASONS = ['commission', 'debt', 'company_expense'] as const;
export type OutgoingPaymentReasonCode = (typeof OUTGOING_PAYMENT_REASONS)[number];

export const OUTGOING_PAYMENT_REASON_LABELS: Record<OutgoingPaymentReasonCode, string> = {
  commission: 'Komisyon',
  debt: 'Borç',
  company_expense: 'Firma masrafı'
};

export const COMPANY_EXPENSE_TYPES = ['rateb', 'kira', 'terwij', 'ulasim', 'yemek', 'others'] as const;
export type CompanyExpenseTypeCode = (typeof COMPANY_EXPENSE_TYPES)[number];

export const COMPANY_EXPENSE_TYPE_LABELS: Record<CompanyExpenseTypeCode, string> = {
  rateb: 'Rateb',
  kira: 'Kira',
  terwij: 'Terwij',
  ulasim: 'Ulasim',
  yemek: 'Yemek',
  others: 'Others'
};

export function formatOutgoingPaymentDisplay(reason: string | null | undefined, expenseType?: string | null): string {
  if (!reason) return '—';
  const label = OUTGOING_PAYMENT_REASON_LABELS[reason as OutgoingPaymentReasonCode];
  if (label === undefined) return reason;
  return label;
}

export function formatExpenseTypeDisplay(expenseType: string | null | undefined): string {
  if (!expenseType) return '—';
  const label = COMPANY_EXPENSE_TYPE_LABELS[expenseType as CompanyExpenseTypeCode];
  return label ?? expenseType;
}
