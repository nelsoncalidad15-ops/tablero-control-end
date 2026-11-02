import Papa from 'papaparse';

export interface ClubSsiRecord {
  id: number;
  comment: string;
  categories: string[];
  branch: string;
  advisor: string;
  year: string;
  semester: string;
  wave: string;
  ce: string;
  channel: string;
  model: string;
  saleDate: string;
  satisfaction: number | null;
  recommendation: number | null;
}

export function clubScore(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value.trim().replace(',', '.'));
  return Number.isFinite(number) && number >= 0 && number <= 10 ? number : null;
}

export function averageClubScore(rows: ClubSsiRecord[], key: 'satisfaction' | 'recommendation') {
  const values = rows.map(row => row[key]).filter((value): value is number => value !== null);
  return { count: values.length, value: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
}

export function formatClubSaleDate(value: string): string {
  if (/^\d{5}(\.\d+)?$/.test(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(value)) * 86400000);
    return date.toLocaleDateString('es-AR', { timeZone: 'UTC' });
  }
  return value;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_\s]+/g, ' ').trim();

export function splitClubCategories(value: string): string[] {
  const unique = new Map<string, string>();
  value.split(/[,;\r\n]+/).forEach(part => {
    const label = part.trim().replace(/\s+/g, ' ');
    const key = normalize(label);
    if (!key || ['-', '0', 'n/a', 'sin categorizar', 'sin categoria'].includes(key)) return;
    if (!unique.has(key)) unique.set(key, label.charAt(0).toUpperCase() + label.slice(1).toLowerCase());
  });
  return [...unique.values()];
}

export function parseClubSsiCsv(csv: string): ClubSsiRecord[] {
  if (!csv.trim()) return [];
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: 'greedy', delimiter: ',' });
  if (parsed.errors.length) throw new Error('La planilla tiene un formato CSV inválido.');
  if (!parsed.data.length) return [];
  const aliases = ['categoria', 'categorias', 'categorizacion', 'categorizacion del comentario', 'categorizacion comentarios'];
  const headerIndex = parsed.data.findIndex(row => row.some(cell => aliases.includes(normalize(cell))));
  if (headerIndex < 0) throw new Error('No se encontró la columna de categorización en la planilla de Club SSI.');
  const headers = parsed.data[headerIndex].map(normalize);
  const index = (names: string[]) => headers.findIndex(h => names.includes(h));
  const category = index(aliases);
  const commentAlias = index(['comentario', 'comentarios', 'observacion', 'observaciones', 'comentario del cliente']);
  const comment = commentAlias >= 0 ? commentAlias : headers.findIndex(h => h.startsWith('q1.1'));
  const branch = index(['provincia', 'sucursal', 'concesionario', 'sede']);
  const advisor = index(['asesor', 'vendedor', 'asesor comercial']);
  return parsed.data.slice(headerIndex + 1).filter(row => row.some(cell => cell.trim())).map((row, i) => ({
    id: headerIndex + i + 2,
    comment: row[comment]?.trim() || '',
    categories: splitClubCategories(row[category] || ''),
    branch: row[branch]?.trim().toUpperCase() || 'Sin sucursal',
    advisor: row[advisor]?.trim() || 'Sin asesor',
    year: row[index(['ano'])]?.trim() || '',
    semester: row[index(['semestre'])]?.trim() || '',
    wave: row[index(['ola'])]?.trim() || '',
    ce: row[index(['ce'])]?.trim() || '',
    channel: row[index(['canal venta', 'canal de venta'])]?.trim().toUpperCase() || '',
    model: row[index(['modelo'])]?.trim() || '',
    saleDate: formatClubSaleDate(row[index(['fecha venta'])]?.trim() || ''),
    satisfaction: clubScore(row[index(['satis. general', 'satisfaccion general'])] || ''),
    recommendation: clubScore(row[index(['recom.', 'recomendacion'])] || ''),
  }));
}

export function summarizeClubSsi(rows: ClubSsiRecord[]) {
  const counts = new Map<string, { name: string; value: number }>();
  rows.forEach(row => row.categories.forEach(name => {
    const key = normalize(name);
    const entry = counts.get(key) || { name, value: 0 };
    entry.value++;
    counts.set(key, entry);
  }));
  return [...counts.values()].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}
