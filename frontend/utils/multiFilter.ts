export type MultiFilterMode = 'include' | 'exclude';

/**
 * Empty selection = no filter (show all), in both include and exclude modes.
 * Include: value must be in selected.
 * Exclude: value must not be in selected (missing/null values pass).
 */
export function matchesMultiFilter(
  value: string | null | undefined,
  selected: string[],
  mode: MultiFilterMode = 'include'
): boolean {
  if (!selected.length) return true;
  const inList = value != null && value !== '' && selected.includes(value);
  return mode === 'include' ? inList : !inList;
}
