export type IncomingPaymentTypeCode = 'Cash' | 'Bank' | 'Scholarship';

export const INCOMING_PAYMENT_TYPES: IncomingPaymentTypeCode[] = ['Cash', 'Bank', 'Scholarship'];

export const INCOMING_PAYMENT_TYPE_LABELS: Record<IncomingPaymentTypeCode, string> = {
  Cash: 'Nakit',
  Bank: 'Banka',
  Scholarship: 'Burs',
};

export function formatIncomingPaymentType(value: string | undefined | null): string {
  if (value === 'Cash') return INCOMING_PAYMENT_TYPE_LABELS.Cash;
  if (value === 'Bank') return INCOMING_PAYMENT_TYPE_LABELS.Bank;
  if (value === 'Scholarship') return INCOMING_PAYMENT_TYPE_LABELS.Scholarship;
  return value || '—';
}
