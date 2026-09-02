import { Period } from '../types';

export function getDefaultPeriodIds(periods: Period[]): string[] {
  return periods.filter((p) => p.isDefault === true).map((p) => p.id);
}

export function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}
