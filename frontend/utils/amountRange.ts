export type AmountBoundInput = string | number | null | undefined;

export type ParsedAmountBounds = {
  from: number | null;
  to: number | null;
  error: string | null;
};

/** Empty or 0–0 is the fallback row used when no bounded range contains the amount. */
export function parseAmountBounds(rawFrom: AmountBoundInput, rawTo: AmountBoundInput): ParsedAmountBounds {
  const fromBlank = rawFrom === null || rawFrom === undefined || String(rawFrom).trim() === '';
  const toBlank = rawTo === null || rawTo === undefined || String(rawTo).trim() === '';
  if (fromBlank && toBlank) return { from: null, to: null, error: null };
  if (fromBlank || toBlank) {
    return { from: null, to: null, error: 'Başlangıç ve bitiş tutarı birlikte girilmelidir.' };
  }
  const from = Number(rawFrom);
  const to = Number(rawTo);
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return { from: null, to: null, error: 'Başlangıç ve bitiş tutarı sayı olmalıdır.' };
  }
  if (from === 0 && to === 0) return { from: null, to: null, error: null };
  if (from < 0 || to < 0) {
    return { from: null, to: null, error: 'Başlangıç ve bitiş tutarı negatif olamaz.' };
  }
  if (from >= to) {
    return { from: null, to: null, error: 'Başlangıç tutarı bitiş tutarından küçük olmalıdır.' };
  }
  return { from, to, error: null };
}

export function amountRangesOverlap(
  a: { from: number | null; to: number | null },
  b: { from: number | null; to: number | null }
): boolean {
  const aOpen = a.from == null || a.to == null;
  const bOpen = b.from == null || b.to == null;
  if (aOpen && bOpen) return true;
  if (aOpen || bOpen) return false;
  return Math.max(a.from as number, b.from as number) < Math.min(a.to as number, b.to as number);
}

export function amountRangeConflictMessage(
  rows: { key: string; from: AmountBoundInput; to: AmountBoundInput }[],
  overlapMessage: string
): string | null {
  const parsed: { key: string; from: number | null; to: number | null }[] = [];
  for (const row of rows) {
    const bounds = parseAmountBounds(row.from, row.to);
    if (bounds.error) return bounds.error;
    parsed.push({ key: row.key, from: bounds.from, to: bounds.to });
  }
  for (let i = 0; i < parsed.length; i += 1) {
    for (let j = i + 1; j < parsed.length; j += 1) {
      if (parsed[i].key !== parsed[j].key) continue;
      if (amountRangesOverlap(parsed[i], parsed[j])) return overlapMessage;
    }
  }
  return null;
}

export function formatAmountBound(value: number | null | undefined): string {
  return value == null || Number.isNaN(Number(value)) ? '—' : String(value);
}
