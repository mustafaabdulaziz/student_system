/** Local calendar day as YYYY-MM-DD for an ISO-ish timestamp. */
export function createdAtToDateKey(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** `fromKey` / `toKey` are HTML date input values (YYYY-MM-DD). Empty = open bound. */
export function matchesCreatedAtRange(
  createdAt: string | undefined | null,
  fromKey: string,
  toKey: string
): boolean {
  if (!fromKey && !toKey) return true;
  const day = createdAtToDateKey(createdAt ?? undefined);
  if (!day) return false;
  let from = fromKey.trim();
  let to = toKey.trim();
  if (from && to && from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}
