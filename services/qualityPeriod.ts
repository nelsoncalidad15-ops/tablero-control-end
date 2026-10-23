// Preserve the calendar day recorded in the spreadsheet, without timezone shifts.
export function qualityDate(value: string | undefined): string {
  const text = String(value || '').trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]|$)/);
  const local = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T]|$)/);
  if (!iso && !local) return '';
  const [year, month, day] = iso ? [+iso[1], +iso[2], +iso[3]] : [+local![3], +local![2], +local![1]];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function matchesQualityDate(value: string | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  const day = qualityDate(value);
  return Boolean(day) && (!from || day >= from) && (!to || day <= to);
}
