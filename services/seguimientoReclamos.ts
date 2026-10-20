export const SEGUIMIENTO_RECLAMOS_KEY = 'seguimiento_reclamos_pv';
export const RECLAMOS_SHEET_TITLE = 'Reclamos';

export const MANAGEMENT_STATES = ['PENDIENTE', 'INCOMPLETA', 'COMPLETA'] as const;
export type ManagementState = typeof MANAGEMENT_STATES[number];

export type SeguimientoFilters = {
  year?: number;
  month?: number;
  branch?: string;
  managementState?: ManagementState | '';
  type?: 'RECLAMO' | 'QUEJA' | '';
};

export type ReclamoRecord = {
  date: Date | null;
  year: number | null;
  month: number | null;
  branch: string;
  orderKey: string;
  sector: string;
  reasons: string[];
  type: 'RECLAMO' | 'QUEJA' | 'SIN CLASIFICAR';
  managementState: ManagementState;
  qualityState: 'OBSERVADA' | 'CORRECTA' | 'SIN VALIDAR';
  resolved: boolean;
  advisorKey: string;
};

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const normalizeText = (value: unknown) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const normalizeHeader = (value: unknown) => normalizeText(value);
const cell = (row: unknown[], index: number | undefined) => index === undefined ? '' : String(row[index] ?? '').trim();

const hasSubstance = (value: unknown) => {
  const clean = normalizeText(value);
  if (!clean) return false;
  return !new Set([
    '-', 's d', 'sd', 'n a', 'na', 'sin datos', 'sin informacion',
    'pendiente', 'no aplica', 'no corresponde', 'ninguno', 'ninguna',
    'no posee', 'sin accion', 'sin causa',
  ]).has(clean);
};

const monthLookup: Record<string, number> = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3,
  abr: 4, abril: 4, may: 5, mayo: 5, jun: 6, junio: 6,
  jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9,
  septiembre: 9, set: 9, setiembre: 9, oct: 10, octubre: 10,
  nov: 11, noviembre: 11, dic: 12, diciembre: 12,
};

const createDate = (year: number, month: number, day: number) => {
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
};

export const parseArgentinaDate = (value: unknown): Date | null => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const text = String(value ?? '').trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T].*)?$/);
  if (match) return createDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s.*)?$/);
  if (match) return createDate(Number(match[3]), Number(match[2]), Number(match[1]));

  match = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .match(/^(\d{1,2})[- ]([a-z]{3,10})[- ](\d{2,4})$/);
  if (match) {
    const month = monthLookup[match[2]] ?? monthLookup[match[2].slice(0, 4)] ?? monthLookup[match[2].slice(0, 3)];
    if (month) return createDate(Number(match[3]), month, Number(match[1]));
  }

  // Google Sheets serial dates are days from 1899-12-30.
  if (/^\d{5}(?:\.\d+)?$/.test(text)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(text)) * 86_400_000);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
};

const normalizeBranch = (value: unknown) => {
  const clean = normalizeText(value);
  if (!clean) return '';
  if (clean.includes('jujuy') || clean === '3059') return 'Jujuy';
  if (clean.includes('salta') || clean === '3087' || clean === '3089') return 'Salta';
  if (clean.includes('express')) return 'Express';
  if (clean.includes('movil')) return 'Taller MÃ³vil';
  return String(value).trim().replace(/\s+/g, ' ');
};

const normalizeOrder = (value: unknown) => normalizeText(value)
  .replace(/^(orden de reparacion|orden|or)\s*/, '')
  .replace(/\s+/g, '');

const canonicalSector = (value: unknown) => {
  const clean = normalizeText(value);
  if (!clean) return 'Sin sector';
  const known: Record<string, string> = {
    'servicio prestado': 'Servicio Prestado',
    'trato personal': 'Trato Personal',
    organizacion: 'OrganizaciÃ³n',
    'trabajo del taller': 'Trabajo del taller',
    lavado: 'Lavado',
  };
  return known[clean] || String(value).trim().replace(/\s+/g, ' ').slice(0, 60);
};

const canonicalReasons = (value: unknown) => {
  const items = String(value ?? '').split(/[,;\n\r|]+/).map(part => part.trim()).filter(Boolean);
  const known = new Set(['servicio prestado', 'trato personal', 'organizacion', 'trabajo del taller', 'lavado']);
  if (items.length === 0) return ['Otros motivos'];
  return [...new Set(items.map(item => {
    const clean = normalizeText(item);
    if (known.has(clean)) return canonicalSector(item);
    return 'Otros motivos';
  }))];
};

const normalizeType = (value: unknown): ReclamoRecord['type'] => {
  const clean = normalizeText(value);
  if (clean.includes('queja')) return 'QUEJA';
  if (clean.includes('reclamo')) return 'RECLAMO';
  return 'SIN CLASIFICAR';
};

const qualityState = (value: unknown): ReclamoRecord['qualityState'] => {
  const clean = normalizeText(value);
  if (!clean) return 'SIN VALIDAR';
  if (/\b(mal|incorrect[oa]|observad[oa]|rechazad[oa]|no correcto)\b/.test(clean)) return 'OBSERVADA';
  if (/\b(bien|correct[oa]|aprobado|aprobada|si|validado|validada)\b/.test(clean)) return 'CORRECTA';
  return 'SIN VALIDAR';
};

const yesValue = (value: unknown) => {
  const clean = normalizeText(value);
  return ['si', 's', 'resuelto', 'resuelta', 'cerrado', 'cerrada'].includes(clean);
};

const HEADER_ALIASES: Record<string, string[]> = {
  nro: ['nro', 'numero', 'numero reclamo'],
  sucursal: ['sucursal'],
  orden: ['orden', 'or'],
  sector: ['sector resp', 'sector responsable'],
  type: ['reclamo queja', 'reclamo', 'tipo reclamo'],
  date: ['fecha reclamo queja', 'fecha reclamo', 'fecha queja'],
  month: ['mes'],
  advisor: ['asesor asignado'],
  cause: ['causa raiz'],
  containment: ['accion contencion', 'accion de contencion'],
  corrective: ['accion correctiva'],
  solutionOwner: ['responsable de solucion'],
  resolved: ['reclamo resuelto si no', 'reclamo resuelto', 'resuelto'],
  quality: ['gestionado bien o mal', 'gestionado bien mal'],
  reasons: ['motivos de reclamo', 'motivo de reclamo'],
};

const EXPECTED_INDEXES: Record<string, number> = {
  nro: 0, sucursal: 1, orden: 2, sector: 3, type: 5, date: 8, month: 9,
  advisor: 11, cause: 13, containment: 14, corrective: 15, solutionOwner: 16,
  resolved: 18, quality: 22, reasons: 23,
};

export const parseReclamosRows = (values: unknown[][]) => {
  if (!values.length) throw new Error('La pestaÃ±a Reclamos no contiene filas.');
  const headers = values[0].map(normalizeHeader);
  const indexes: Record<string, number | undefined> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    indexes[field] = headers.findIndex(header => aliases.includes(header));
    if (indexes[field] === -1) indexes[field] = undefined;
  }

  const validatedLayout = normalizeHeader(values[0][0]) === 'nro' &&
    normalizeHeader(values[0][1]) === 'sucursal' && normalizeHeader(values[0][2]) === 'orden' &&
    normalizeHeader(values[0][11]) === 'asesor asignado' && normalizeHeader(values[0][18]).startsWith('reclamo resuelto');
  const missingHeaders: string[] = [];
  for (const field of Object.keys(HEADER_ALIASES)) {
    if (indexes[field] === undefined && validatedLayout) indexes[field] = EXPECTED_INDEXES[field];
    if (indexes[field] === undefined && ['sucursal', 'orden', 'sector', 'date', 'cause', 'containment', 'corrective', 'solutionOwner'].includes(field)) {
      missingHeaders.push(field);
    }
  }
  if (missingHeaders.length) throw new Error(`Faltan encabezados obligatorios en Reclamos: ${missingHeaders.join(', ')}.`);

  let blankRows = 0;
  let invalidIdentityRows = 0;
  let invalidDateRows = 0;
  const records: ReclamoRecord[] = [];
  for (const row of values.slice(1)) {
    if (!row.some(value => String(value ?? '').trim() !== '')) {
      blankRows++;
      continue;
    }
    const branch = normalizeBranch(cell(row, indexes.sucursal));
    const orderKey = normalizeOrder(cell(row, indexes.orden));
    if (!branch || !orderKey) {
      invalidIdentityRows++;
      continue;
    }
    const date = parseArgentinaDate(cell(row, indexes.date)) || parseArgentinaDate(cell(row, indexes.month));
    if (!date) invalidDateRows++;
    const managementFields = [
      cell(row, indexes.cause), cell(row, indexes.containment),
      cell(row, indexes.corrective), cell(row, indexes.solutionOwner),
    ];
    const substantive = managementFields.map(hasSubstance);
    const hasAnyManagement = substantive.some(Boolean);
    const managementState: ManagementState = !hasAnyManagement
      ? 'PENDIENTE'
      : substantive.every(Boolean) ? 'COMPLETA' : 'INCOMPLETA';

    records.push({
      date,
      year: date?.getUTCFullYear() ?? null,
      month: date ? date.getUTCMonth() + 1 : null,
      branch,
      orderKey,
      sector: canonicalSector(cell(row, indexes.sector)),
      reasons: canonicalReasons(cell(row, indexes.reasons)),
      type: normalizeType(cell(row, indexes.type)),
      managementState,
      qualityState: qualityState(cell(row, indexes.quality)),
      resolved: yesValue(cell(row, indexes.resolved)),
      advisorKey: normalizeText(cell(row, indexes.advisor)),
    });
  }
  return {
    records,
    dataQuality: { sourceRows: Math.max(values.length - 1, 0), blankRows, invalidIdentityRows, invalidDateRows },
  };
};

type AnalyticsFilters = {
  year: number | null;
  month: number | null;
  branch: string;
  managementState: string;
  type: string;
};

const matches = (record: ReclamoRecord, filters: AnalyticsFilters, skip: Array<keyof AnalyticsFilters> = []) =>
  (skip.includes('year') || filters.year === null || record.year === filters.year) &&
  (skip.includes('month') || filters.month === null || record.month === filters.month) &&
  (skip.includes('branch') || filters.branch === 'all' || record.branch === filters.branch) &&
  (skip.includes('managementState') || filters.managementState === 'all' || record.managementState === filters.managementState) &&
  (skip.includes('type') || filters.type === 'all' || record.type === filters.type);

const countMetrics = (records: ReclamoRecord[]) => {
  const uniqueOrders = new Set(records.map(record => `${normalizeText(record.branch)}::${record.orderKey}`));
  const complete = records.filter(record => record.managementState === 'COMPLETA').length;
  return {
    records: records.length,
    uniqueOrders: uniqueOrders.size,
    complete,
    pendingToComplete: records.filter(record => record.managementState !== 'COMPLETA').length,
    observed: records.filter(record => record.qualityState === 'OBSERVADA').length,
    correctComplete: records.filter(record => record.managementState === 'COMPLETA' && record.qualityState === 'CORRECTA').length,
    resolved: records.filter(record => record.resolved).length,
    advisorCount: new Set(records.map(record => record.advisorKey).filter(Boolean)).size,
    completionRate: records.length ? Math.round((complete / records.length) * 1000) / 10 : 0,
    states: {
      pendiente: records.filter(record => record.managementState === 'PENDIENTE').length,
      incompleta: records.filter(record => record.managementState === 'INCOMPLETA').length,
      completa: complete,
    },
  };
};

const countBy = (records: ReclamoRecord[], key: (record: ReclamoRecord) => string) => {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(key(record), (counts.get(key(record)) ?? 0) + 1);
  return [...counts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
};

export const buildSeguimientoSummary = (
  parsed: ReturnType<typeof parseReclamosRows>,
  filterInput: SeguimientoFilters = {},
  now = new Date(),
) => {
  const all = parsed.records.filter(record => record.date);
  const years = [...new Set(all.map(record => record.year as number))].sort((a, b) => a - b);
  const monthsByYear: Record<number, number[]> = {};
  for (const year of years) monthsByYear[year] = [...new Set(all.filter(record => record.year === year).map(record => record.month as number))].sort((a, b) => a - b);
  const months = MONTHS.map((name, index) => ({ number: index + 1, name }));

  const requestedYear = Number(filterInput.year);
  const year = Number.isFinite(requestedYear) && years.includes(requestedYear) ? requestedYear : null;
  const requestedMonth = Number(filterInput.month);
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : null;
  const branches = [...new Set(all.map(record => record.branch))].sort((a, b) => a.localeCompare(b));
  const branch = filterInput.branch && branches.includes(filterInput.branch) ? filterInput.branch : 'all';
  const allowedStates = ['PENDIENTE', 'INCOMPLETA', 'COMPLETA'];
  const managementState = allowedStates.includes(String(filterInput.managementState)) ? String(filterInput.managementState) : 'all';
  const type = ['RECLAMO', 'QUEJA'].includes(String(filterInput.type)) ? String(filterInput.type) : 'all';
  const filters: AnalyticsFilters = { year, month, branch, managementState, type };
  const selected = all.filter(record => matches(record, filters));
  const trendYear = (year ?? Math.max(...years, 0)) || null;
  const trendFilters = { ...filters, year: trendYear };
  const trendRecords = all.filter(record => matches(record, trendFilters, ['month']));
  const branchRecords = all.filter(record => matches(record, filters, ['branch']));
  const matrixRecords = all.filter(record => matches(record, trendFilters, ['month']));

  const matrix = branches.filter(name => branch === 'all' || name === branch).map(branchName => ({
    branch: branchName,
    months: (monthsByYear[year ?? Math.max(...years, 0)] || []).map(monthNumber => {
      const group = matrixRecords.filter(record => record.branch === branchName && record.month === monthNumber);
      return { month: monthNumber, ...countMetrics(group) };
    }),
  }));

  const sectorCounts = countBy(selected, record => record.sector);
  const reasonCounts = countBy(selected.flatMap(record => record.reasons.map(reason => ({ ...record, reason }))), record => (record as ReclamoRecord & { reason: string }).reason);
  const tableCounts = new Map<string, { year: number; month: number; branch: string; sector: string; type: string; state: string; count: number }>();
  for (const record of selected) {
    const key = `${record.year}|${record.month}|${record.branch}|${record.sector}|${record.type}|${record.managementState}`;
    const row = tableCounts.get(key) || { year: record.year || 0, month: record.month || 0, branch: record.branch, sector: record.sector, type: record.type, state: record.managementState, count: 0 };
    row.count++;
    tableCounts.set(key, row);
  }

  return {
    privacyMode: 'aggregate-only' as const,
    filters: { year, month, branch, managementState, type },
    options: { years, months, monthsByYear, branches, managementStates: [...MANAGEMENT_STATES], types: ['RECLAMO', 'QUEJA'] },
    summary: countMetrics(selected),
    trends: MONTHS.map((name, index) => ({
      month: index + 1,
      name,
      ...countMetrics(trendRecords.filter(record => record.month === index + 1)),
    })).filter(item => trendRecords.some(record => record.month === item.month)),
    managementByBranch: branches.filter(name => branch === 'all' || name === branch).map(name => ({
      name,
      ...countMetrics(branchRecords.filter(record => record.branch === name)),
    })),
    sectors: sectorCounts,
    reasons: reasonCounts,
    matrix,
    aggregateTable: [...tableCounts.values()].sort((a, b) => b.count - a.count || a.branch.localeCompare(b.branch)),
    dataQuality: {
      ...parsed.dataQuality,
      rowsWithoutDateInCurrentScope: parsed.records.filter(record => !record.date &&
        (branch === 'all' || record.branch === branch)).length,
      rowsExcludedFromTimeAnalysis: parsed.dataQuality.invalidDateRows,
    },
    availableData: {
      defaultYear: years.includes(now.getFullYear()) ? now.getFullYear() : Math.max(...years, 0) || null,
      defaultMonth: years.includes(now.getFullYear()) && monthsByYear[now.getFullYear()]?.includes(now.getMonth() + 1)
        ? now.getMonth() + 1
      : monthsByYear[Math.max(...years, 0)]?.slice(-1)[0] ?? null,
    },
  };
};

