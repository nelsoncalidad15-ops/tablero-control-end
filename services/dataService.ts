Warning: truncated output (original token count: 31062)
Total output lines: 2803


/// <reference types="vite/client" />
import Papa from 'papaparse';
import { AutoRecord, QualityRecord, SalesQualityRecord, SalesClaimsRecord, DetailedQualityRecord, PostventaKpiRecord, BillingRecord, PCGCRecord, CemOsRecord, InternalPostventaRecord, ActionPlanRecord, CourseGrade, RelatorioItem, CollaboratorContact, CoursePhase, WarrantyRecord, QualityObjectiveRecord, QualityObjectiveSummaryRecord, QualityObjectiveScaleRecord, PvtOccupationRecord, ScoringRecord, SatisfactionSurveyRecord } from '../types';
import type { EnvironmentalConsumptionRecord } from '../types';
import { MOCK_DATA } from '../constants';
import { buildApiUrl } from './apiConfig';
import { getDashboardToken } from './auth';

// --- Helper Functions ---

// Clean header function that safely removes BOM and specific control chars
const cleanHeader = (h: string) => {
    if (!h) return '';
    // Removes BOM, carriage returns, newlines, and double quotes.
    // Also removes special characters that might interfere with matching.
    return h.replace(/^\uFEFF/, '')
            .replace(/[\r\n]+/g, ' ')
            .replace(/["]/g, '')
            .replace(/_/g, ' ')
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
            .toLowerCase()
            .trim();
};

const normalizeBranch = (val: string) => {
    if (!val || val.trim() === '') return 'GENERAL';
    const s = val.trim().toUpperCase();
    if (s.includes('JUJUY') || s === '3059') return 'JUJUY';
    if (s.includes('SALTA') || s === '3087' || s === '3089') return 'SALTA';
    if (s.includes('SANTA FE')) return 'SANTA FE';
    if (s.includes('EXPRESS')) return 'EXPRESS';
    if (s.includes('MOVIL')) return 'MOVIL';
    return s;
};

const SPANISH_MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const normalizeMonth = (val: string) => {
    if (!val) return 'Unknown';
    // Extract only the month part if it's "Enero - 2025" or similar
    const firstPart = val.split(/[-/ ]/)[0].trim().toLowerCase();

    // Handle short formats like "dic", "ene", "dic.", "ene."
    const map: Record<string, string> = {
        'ene': 'Enero', 'ene.': 'Enero', 'enero': 'Enero',
        'feb': 'Febrero', 'feb.': 'Febrero', 'febrero': 'Febrero',
        'mar': 'Marzo', 'mar.': 'Marzo', 'marzo': 'Marzo',
        'abr': 'Abril', 'abr.': 'Abril', 'abril': 'Abril',
        'may': 'Mayo', 'may.': 'Mayo', 'mayo': 'Mayo',
        'jun': 'Junio', 'jun.': 'Junio', 'junio': 'Junio',
        'jul': 'Julio', 'jul.': 'Julio', 'julio': 'Julio',
        'ago': 'Agosto', 'ago.': 'Agosto', 'agosto': 'Agosto',
        'sep': 'Septiembre', 'sep.': 'Septiembre', 'sept': 'Septiembre', 'sept.': 'Septiembre', 'septiembre': 'Septiembre',
        'set': 'Septiembre', 'set.': 'Septiembre',
        'oct': 'Octubre', 'oct.': 'Octubre', 'octubre': 'Octubre',
        'nov': 'Noviembre', 'nov.': 'Noviembre', 'noviembre': 'Noviembre',
        'dic': 'Diciembre', 'dic.': 'Diciembre', 'diciembre': 'Diciembre'
    };
    if (map[firstPart]) return map[firstPart];

    // If it's a number like "01", "02"...
    const monthNum = parseInt(firstPart);
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        return SPANISH_MONTHS[monthNum - 1];
    }

    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
};

const isKnownMonth = (val: string) => SPANISH_MONTHS.includes(normalizeMonth(val));

const extractMonthFromDateString = (val: string) => {
    if (!val) return 'Unknown';

    const clean = val.trim();
    if (!clean) return 'Unknown';

    const yearMonthDayMatch = clean.match(/^\d{4}[-/](\d{1,2})[-/]\d{1,2}/);
    if (yearMonthDayMatch) {
        const monthNum = parseInt(yearMonthDayMatch[1], 10);
        if (monthNum >= 1 && monthNum <= 12) return SPANISH_MONTHS[monthNum - 1];
    }

    const dayMonthYearMatch = clean.match(/^\d{1,2}[-/](\d{1,2})[-/]\d{2,4}/);
    if (dayMonthYearMatch) {
        const monthNum = parseInt(dayMonthYearMatch[1], 10);
        if (monthNum >= 1 && monthNum <= 12) return SPANISH_MONTHS[monthNum - 1];
    }

    const directMonth = normalizeMonth(clean);
    return SPANISH_MONTHS.includes(directMonth) ? directMonth : 'Unknown';
};

const pickFirstValidMonth = (...values: Array<string | undefined>) => {
    for (const value of values) {
        if (!value) continue;
        const extracted = extractMonthFromDateString(value);
        if (SPANISH_MONTHS.includes(extracted)) return extracted;
    }
    return 'Unknown';
};

const normalizeWarrantyLot = (value: string) => {
    if (!value) return 'Sin lote';
    const clean = String(value).trim();
    if (!clean) return 'Sin lote';

    const directMatch = clean.match(/\b(7|14|21|28)\b/);
    if (directMatch) return directMatch[1];

    const dateMatch = clean.match(/(\d{1,2})[/-]\d{1,2}[/-]\d{2,4}/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      if ([7, 14, 21, 28].includes(day)) return String(day);
    }

    return clean;
};

const parseNumber = (val: string): number => {
  if (!val) return 0;
  let cleanVal = val.replace(/[$\s%]/g, '').trim();
  if (!cleanVal) return 0;

  if (cleanVal.includes(',') && cleanVal.includes('.')) {
    const lastDot = cleanVal.lastIndexOf('.');
    const lastComma = cleanVal.lastIndexOf(',');
    if (lastComma > lastDot) {
      cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
    } else {
      cleanVal = cleanVal.replace(/,/g, '');
    }
  } else if (cleanVal.includes(',')) {
    if ((cleanVal.match(/,/g) || []).length > 1) {
       cleanVal = cleanVal.replace(/,/g, '');
    } else {
       cleanVal = cleanVal.replace(',', '.');
    }
  }

  const num = parseFloat(cleanVal);
  return isNaN(num) ? 0 : num;
};

const parseImpactValue = (rawValue: string, impactType: string, impactText: string): number | null => {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return null;

  const parsed = parseNumber(trimmed);
  const normalizedType = cleanHeader(impactType);
  const normalizedText = String(impactText || '').trim();

  if (normalizedType === 'cobro' || normalizedType === 'descuento' || normalizedType === 'bonus') {
    if (normalizedText.includes('%')) {
      const textPercent = parseNumber(normalizedText);
      if (Number.isFinite(textPercent)) return textPercent / 100;
      if (parsed > 100) return parsed / 1000;
      if (parsed > 1) return parsed / 100;
      return parsed / 100;
    }

    if (parsed > 100) return parsed / 1000;
    if (parsed > 1) return parsed / 100;
  }

  return parsed;
};

// Helper for scores that can be null (not 0)
const parseScore = (val: string): number | null => {
    if (!val || val.trim() === '' || val.trim() === '-') return null;
    const num = parseNumber(val);
    return num === 0 ? null : num; // Assuming 0 usually means no score in this context, unless specified
};

const parseScoreInRange = (val: string, min: number, max: number): number | null => {
    const num = parseScore(val);
    if (num === null) return null;
    return num >= min && num <= max ? num : null;
};

export const normalizeKey = (key: string) => {
    if (!key) return '';
    return key.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
};

const getRowValue = (row: Record<string, any>, ...possibleKeys: string[]) => {
    const normalizedPossibleKeys = possibleKeys.map(normalizeKey);
    const keys = Object.keys(row);

    for (const possibleKey of possibleKeys) {
        if (row[possibleKey] !== undefined) return row[possibleKey];
    }

    const foundKey = keys.find(key => normalizedPossibleKeys.includes(normalizeKey(key)));
    return foundKey ? row[foundKey] : undefined;
};

const cleanVendedor = (val: string) => {
    if (!val) return '';
    let s = val.trim();

    // Special case for CH VIRT
    if (s.includes('CH VIRT - ')) {
        s = s.replace('CH VIRT - ', 'CH VIRT, ');
    } else {
        // Remove "JJY - " or similar prefixes (2 to 5 uppercase letters + dash)
        s = s.replace(/^[A-Z]{2,5}\s*-\s*/, '');
    }

    // Remove numbers at the end
    s = s.replace(/\d+$/, '');

    return s.trim();
};

// --- Robust CSV Parser ---
// Handles newlines inside quotes, escaped quotes, and auto-detects delimiter
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  // Detect delimiter based on first line roughly
  const firstLineEnd = text.indexOf('\n');
  const firstLine = text.substring(0, firstLineEnd > -1 ? firstLineEnd : text.length);
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semicolonCount > commaCount && semicolonCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentVal += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of cell
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      // End of row
      // Handle \r\n sequence
      if (char === '\r' && nextChar === '\n') i++;

      currentRow.push(currentVal.trim());
      if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
         rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  // Push last row if exists
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.length > 0) rows.push(currentRow);
  }

  return rows;
};

// --- Main Data Fetchers ---

const PROXY_REQUEST_TIMEOUT_MS = 45000;
// Keep the wake-up request alive long enough for a Render Free cold start.
const BACKEND_WAKE_TIMEOUT_MS = 90_000;
const RETRYABLE_PROXY_ATTEMPTS = 2;

let backendWakePromise: Promise<void> | null = null;
const rawCsvTextCache = new Map<string, string>();
const rawCsvPromiseCache = new Map<string, Promise<string>>();

const SESSION_CACHE_PREFIX = 'autosol_csv_cache_';
const SESSION_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

const getCachedCsv = (sheetKey: string): string | null => {
    const memory = rawCsvTextCache.get(sheetKey);
    if (memory) return memory;

    if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
            const stored = window.sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${sheetKey}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Date.now() - parsed.ts < SESSION_CACHE_TTL_MS && typeof parsed.data === 'string') {
                    rawCsvTextCache.set(sheetKey, parsed.data);
                    return parsed.data;
                }
            }
        } catch {
            // Ignorar errores de acceso a sessionStorage
        }
    }
    return null;
};

const setCachedCsv = (sheetKey: string, text: string) => {
    rawCsvTextCache.set(sheetKey, text);
    if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
            window.sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${sheetKey}`, JSON.stringify({
                ts: Date.now(),
                data: text
            }));
        } catch {
            // Ignorar quota exceeded o modo incÃ³gnito
        }
    }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const FRONTEND_ONLY_SHEET_KEYS = new Set<string>();

const isFrontendOnlySheetKey = (sheetKey: string) => FRONTEND_ONLY_SHEET_KEYS.has(sheetKey);

const MOCK_POSTVENTA_KPI_DATA: PostventaKpiRecord[] = [
    {
        id: 'kpi-1',
        sucursal: 'Jujuy',
        mes: 'Enero',
        anio: 2026,
        lvs: 4.8,
        email_validos: 96,
        tasa_respuesta: 34,
        dac: 0.12,
        contrato_mantenimiento: 22,
        reporte_tecnico: 51,
        reporte_garantia: 49,
        ampliacion_trabajo: 55,
        ppt_diario: 26,
        conversion_ppt_serv: 63,
        oudi_servicios: 13,
        costos_controlables: 78,
        costo_sueldos: 59,
        stock_muerto: 11,
        meses_stock: 2.6,
        cotizacion_seguros: 12,
        uodi_repuestos: 8,
        uodi_posventa: 9,
        incentivo_calidad: 100,
        plan_incentivo_posventa: 101,
        plan_incentivo_repuestos: 121,
        uops_total: 102,
    },
    {
        id: 'kpi-2',
        sucursal: 'Salta',
        mes: 'Febrero',
        anio: 2026,
        lvs: 4.6,
        email_validos: 94,
        tasa_respuesta: 31,
        dac: 0.18,
        contrato_mantenimiento: 20,
        reporte_tecnico: 47,
        reporte_garantia: 46,
        ampliacion_trabajo: 48,
        ppt_diario: 25,
        conversion_ppt_serv: 58,
        oudi_servicios: 12,
        costos_controlables: 79,
        costo_sueldos: 58,
        stock_muerto: 13,
        meses_stock: 2.9,
        cotizacion_seguros: 10,
        uodi_repuestos: 7,
        uodi_posventa: 8,
        incentivo_calidad: 98,
        plan_incentivo_posventa: 99,
        plan_incentivo_repuestos: 118,
        uops_total: 97,
    },
    {
        id: 'kpi-3',
        sucursal: 'Santa Fe',
        mes: 'Marzo',
        anio: 2026,
        lvs: 4.9,
        email_validos: 97,
        tasa_respuesta: 36,
        dac: 0.09,
        contrato_mantenimiento: 24,
        reporte_tecnico: 52,
        reporte_garantia: 50,
        ampliacion_trabajo: 57,
        ppt_diario: 27,
        conversion_ppt_serv: 66,
        oudi_servicios: 14,
        costos_controlables: 76,
        costo_sueldos: 57,
        stock_muerto: 10,
        meses_stock: 2.3,
        cotizacion_seguros: 11,
        uodi_repuestos: 9,
        uodi_posventa: 9,
        incentivo_calidad: 103,
        plan_incentivo_posventa: 104,
        plan_incentivo_repuestos: 123,
        uops_total: 105,
    },
];

const MOCK_POSTVENTA_BILLING_DATA: BillingRecord[] = [
    {
        id: 'bill-1',
        nro_mes: 1,
        mes: 'Enero',
        sucursal: 'Jujuy',
        area: 'Taller',
        objetivo_mensual: 12000000,
        avance_fecha: 11200000,
        cumplimiento_fecha_pct: 93.3,
        cumplimiento_cierre_pct: 96.8,
        objetivo_diario: 545455,
        promedio_diario: 509091,
        desvio_fecha: -800000,
        dif_dias_operacion: 1,
        anio: 2026,
    },
    {
        id: 'bill-2',
        nro_mes: 2,
        mes: 'Febrero',
        sucursal: 'Salta',
        area: 'Venta',
        objetivo_mensual: 14500000,
        avance_fecha: 13200000,
        cumplimiento_fecha_pct: 91.0,
        cumplimiento_cierre_pct: 95.2,
        objetivo_diario: 657143,
        promedio_diario: 600000,
        desvio_fecha: -1300000,
        dif_dias_operacion: 2,
        anio: 2026,
    },
    {
        id: 'bill-3',
        nro_mes: 3,
        mes: 'Marzo',
        sucursal: 'Santa Fe',
        area: 'Taller',
        objetivo_mensual: 13900000,
        avance_fecha: 14150000,
        cumplimiento_fecha_pct: 101.8,
        cumplimiento_cierre_pct: 102.1,
        objetivo_diario: 631818,
        promedio_diario: 643182,
        desvio_fecha: 250000,
        dif_dias_operacion: 0,
        anio: 2026,
    },
];

const MOCK_INTERNAL_POSTVENTA_DATA: InternalPostventaRecord[] = [
    {
        id: 'int-1',
        sucursal: 'Jujuy',
        tecnicos: 'Equipo A',
        asesor: 'Mariana',
        operario: 'Luis',
        codigo: 'P-001',
        fecha_inicio: '05/02/2026',
        fecha_fin: '06/02/2026',
        mes: 'Febrero',
        anio: 2026,
        servicio: 'Service 10k',
        dominio: 'AA111BB',
        telefono: '3884000001',
        email: 'cliente1@example.com',
        auto: 'Nivus',
        marca: 'VW',
        chasis: 'CH001',
        created_at: '05/02/2026',
        estado: 'Cerrado',
        nombre_sucursal: 'Jujuy',
        cliente_nombre: 'Cliente Uno',
        servicio_prestado: 4.8,
        trato_personal: 4.9,
        organizacion: 4.7,
        trabajo_taller: 4.6,
        lavado: 4.8,
        obs_servicio_prestado: 'OK',
        obs_trato_personal: 'OK',
        obs_organizacion: 'OK',
        obs_trabajo_taller: 'OK',
        obs_lavado: 'OK',
        tipo_contacto: 'WhatsApp',
        obs_tipo_contacto: 'Respondido',
        observaciones: 'Sin observaciones',
        obs_observaciones: 'Sin novedades',
    },
    {
        id: 'int-2',
        sucursal: 'Salta',
        tecnicos: 'Equipo B',
        asesor: 'Juan',
        operario: 'Pedro',
        codigo: 'P-002',
        fecha_inicio: '11/02/2026',
        fecha_fin: '12/02/2026',
        mes: 'Febrero',
        anio: 2026,
        servicio: 'DiagnÃ³stico',
        dominio: 'BB222CC',
        telefono: '3874000002',
        email: 'cliente2@example.com',
        auto: 'Taos',
        marca: 'VW',
        chasis: 'CH002',
        created_at: '11/02/2026',
        estado: 'En proceso',
        nombre_sucursal: 'Salta',
        cliente_nombre: 'Cliente Dos',
        servicio_prestado: 4.2,
        trato_personal: 4.4,
        organizacion: 4.1,
        trabajo_taller: 4.0,
        lavado: 4.3,
        obs_servicio_prestado: 'Bien',
        obs_trato_personal: 'Bien',
        obs_organizacion: 'Bien',
        obs_trabajo_taller: 'Bien',
        obs_lavado: 'Bien',
        tipo_contacto: 'Llamada',
        obs_tipo_contacto: 'Pendiente',
        observaciones: 'Requiere seguimiento',
        obs_observaciones: 'Revisar',
    },
];

const MOCK_HR_GRADES_DATA: CourseGrade[] = [
    { id: 'hrg-1', unidad: 'Jujuy', colaborador: 'Ana PÃ©rez', area: 'AdministraciÃ³n', funcion: 'Analista', icf: 92, courses: { induccion: 85, seguridad: 90 } },
    { id: 'hrg-2', unidad: 'Jujuy', colaborador: 'Luis GÃ³mez', area: 'Taller', funcion: 'TÃ©cnico', icf: 88, courses: { induccion: 82, seguridad: 86 } },
    { id: 'hrg-3', unidad: 'Salta', colaborador: 'Marta Ruiz', area: 'Comercial', funcion: 'Asesora', icf: 95, courses: { induccion: 92, seguridad: 96 } },
    { id: 'hrg-4', unidad: 'Santa Fe', colaborador: 'Diego Soto', area: 'Posventa', funcion: 'Supervisor', icf: 89, courses: { induccion: 84, seguridad: 88 } },
];

const MOCK_HR_RELATORIO_DATA: RelatorioItem[] = [
    { id: 'rel-1', curso: 'Liderazgo', nombre: 'Ana PÃ©rez', unidad: 'Jujuy', area: 'AdministraciÃ³n', fechaRegistro: '2026-03-12', referenciaMeses: 'Marzo', clase: 'Clase 1', claseFecha: '2026-03-20', claseHora: '10:00', modalidad: 'Virtual', linkCurso: '' },
    { id: 'rel-2', curso: 'Seguridad', nombre: 'Luis GÃ³mez', unidad: 'Jujuy', area: 'Taller', fechaRegistro: '2026-03-14', referenciaMeses: 'Marzo', clase: 'Clase 2', claseFecha: '2026-03-22', claseHora: '14:00', modalidad: 'Presencial', linkCurso: '' },
    { id: 'rel-3', curso: 'Calidad', nombre: 'Marta Ruiz', unidad: 'Salta', area: 'Comercial', fechaRegistro: '2026-03-18', referenciaMeses: 'Marzo', clase: 'Clase 1', claseFecha: '2026-03-25', claseHora: '09:30', modalidad: 'Virtual', linkCurso: '' },
];

const MOCK_HR_CONTACTS_DATA: CollaboratorContact[] = [
    { nombre: 'Ana PÃ©rez', telefono: '3884000001' },
    { nombre: 'Luis GÃ³mez', telefono: '3884000002' },
    { nombre: 'Marta Ruiz', telefono: '3874000003' },
];

const MOCK_HR_PHASES_DATA: CoursePhase[] = [
    { curso: 'Liderazgo', fase: 'Inicial', modalidad: 'Virtual' },
    { curso: 'Seguridad', fase: 'Intermedia', modalidad: 'Presencial' },
    { curso: 'Calidad', fase: 'Final', modalidad: 'Virtual' },
];

const buildRequestHeaders = (): Record<string, string> => {
    const token = getDashboardToken();
    return {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const wakeBackendIfNeeded = async () => {
    const apiBase = buildApiUrl('');
    if (!apiBase || typeof window === 'undefined') return;

    if (!backendWakePromise) {
        backendWakePromise = (async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), BACKEND_WAKE_TIMEOUT_MS);

            try {
                await fetch(buildApiUrl('/api/health'), {
                    signal: controller.signal,
                    headers: buildRequestHeaders()
                });
            } catch (error) {
                console.warn('[DataService] Backend wake-up ping failed, continuing with main request.', error);
            } finally {
                clearTimeout(timeoutId);
            }
        })();
    }

    await backendWakePromise;
};

export const primeBackendConnection = async () => {
    try {
        await wakeBackendIfNeeded();
    } catch (error) {
        console.warn('[DataService] Backend warm-up failed.', error);
    }
};

export const primeSheetData = async (sheetKeys: Array<string | undefined>) => {
    const keys = [...new Set(sheetKeys.filter((key): key is string => Boolean(key)))];
    await Promise.allSettled(keys.map(fetchFromProxy));
};

export const primeSalesQualityData = async (
    salesQualityKey: string,
    salesClaimsKey: string,
    cemOsKey: string,
    cemOsSaltaKey: string
) => primeSheetData([salesQualityKey, salesClaimsKey, cemOsKey, cemOsSaltaKey]);

const fetchFromProxy = async (sheetKey: string): Promise<string> => {
    if (!sheetKey) return '';

    if (sheetKey.startsWith('http://') || sheetKey.startsWith('https://')) {
        try {
            const response = await fetch(sheetKey);
            if (response.ok) {
                return await response.text();
            }
        } catch (directErr) {
            console.warn(`[DataService] Error en fetch directo para ${sheetKey}:`, directErr);
        }
    }

    // Reclamos cambia durante el dÃ­a; una copia anterior en la pestaÃ±a puede
    // ocultar meses reciÃ©n cargados aun despuÃ©s de publicar un frontend nuevo.
    const useClientCache = sheetKey !== 'sales_claims';
    const cachedText = useClientCache ? getCachedCsv(sheetKey) : null;
    if (cachedText) {
        return cachedText;
    }

    const cachedPromise = rawCsvPromiseCache.get(sheetKey);
    if (cachedPromise) {
        return cachedPromise;
    }

    await wakeBackendIfNeeded();

    const url = buildApiUrl(`/api/data/${encodeURIComponent(sheetKey)}`);

    console.log(`[DataService] Fetching from: ${url}`);

    const requestPromise = (async () => {
        let lastError: unknown;

        for (let attempt = 1; attempt <= RETRYABLE_PROXY_ATTEMPTS; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), PROXY_REQUEST_TIMEOUT_MS);

            try {
                const response = await fetch(url, { 
                    signal: controller.signal,
                    headers: buildRequestHeaders()
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    let errorDetail = response.statusText;
                    try {
                        const errorJson = await response.json();
                        errorDetail = errorJson.details || errorJson.error || response.statusText;
                    } catch (e) {
                        // Not JSON, just use status text
                    }
                    throw new Error(errorDetail);
                }

                const text = await response.text();
                if (useClientCache) setCachedCsv(sheetKey, text);
                return text;
            } catch (error: any) {
                clearTimeout(timeoutId);
                lastError = error;
                console.error(`Error fetching from proxy for ${sheetKey} (attempt ${attempt}/${RETRYABLE_PROXY_ATTEMPTS}):`, error);

                const isAbort = error?.name === 'AbortError';
                const isNetwork = error instanceof TypeError;
                const isRetryable = attempt < RETRYABLE_PROXY_ATTEMPTS && (isAbort || isNetwork);

                if (isRetryable) {
                    await delay(1800);
                    continue;
                }

                if (isAbort) {
                    throw new Error(`La peticion al backend excedio el tiempo limite (${Math.round(PROXY_REQUEST_TIMEOUT_MS / 1000)}s). Si el servicio esta en Render Free, espere un momento y vuelva a intentar porque puede estar despertando.`);
                }
                if (isNetwork) {
                    throw new Error(`No se pudo contactar al backend (${url}). Revise que VITE_API_URL apunte al servicio correcto y que Render este respondiendo.`);
                }
                throw error;
            }
        }

        throw lastError instanceof Error ? lastError : new Error('No se pudo completar la solicitud al backend.');
    })();

    rawCsvPromiseCache.set(sheetKey, requestPromise);
    try {
        return await requestPromise;
    } finally {
        rawCsvPromiseCache.delete(sheetKey);
    }
};

export const fetchSheetData = async (sheetKey: string): Promise<AutoRecord[]> => {
  try {
    const text = await fetchFromProxy(sheetKey);
    return parseAutoCSV(text);
  } catch (error) {
    console.error("Error loading sheet data", error);
    throw error;
  }
};

export const fetchQualityData = async (sheetKey: string): Promise<QualityRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parseQualityCSV(text);
    } catch (error) {
      console.error("Error loading quality data", error);
      throw error;
    }
};

export const fetchSalesQualityData = async (sheetKey: string): Promise<SalesQualityRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parseSalesQualityCSV(text);
    } catch (error) {
      console.error("Error loading sales quality data", error);
      throw error;
    }
};

export const fetchSatisfactionSurveyData = async (sheetKey: string): Promise<SatisfactionSurveyRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parseSatisfactionSurveyCSV(text);
    } catch (error) {
      console.error("Error loading SSI/CSI survey data", error);
      throw error;
    }
};

export const fetchScoringData = async (): Promise<ScoringRecord[]> => {
    try {
      const text = await fetchFromProxy('scoring');
      return parseScoringCSV(text);
    } catch (error) {
      console.error("Error loading scoring data", error);
      throw error;
    }
};

export const fetchSalesClaimsData = async (sheetKey: string): Promise<SalesClaimsRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parseSalesClaimsCSV(text);
    } catch (error) {
      console.error("Error loading sales claims data", error);
      throw error;
    }
};

export const fetchDetailedQualityData = async (sheetKey: string): Promise<DetailedQualityRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parseDetailedQualityCSV(text);
    } catch (error) {
      if (sheetKey === 'detailed_quality_salta' || sheetKey.includes('salta')) {
        try {
          const fallbackUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRI_ojcN_sH7fk2qQM3KfZs1Sy4xE7AXRgXVbgYAagleUwiXZhPD5WjQROkh0PbzsHD_XDbGtB-5fX_/pub?gid=1644111701&single=true&output=csv';
          const res = await fetch(fallbackUrl);
          if (res.ok) {
            const text = await res.text();
            return parseDetailedQualityCSV(text);
          }
        } catch (fbError) {
          console.error("Fallback detailed quality salta failed", fbError);
        }
      }
      console.error("Error loading detailed quality data for " + sheetKey, error);
      throw error;
    }
};

export const fetchPostventaKpiData = async (sheetKey: string): Promise<PostventaKpiRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parsePostventaKpiCSV(text);
    } catch (error) {
      console.error("Error loading postventa kpi data", error);
      throw error;
    }
};

export const fetchPvtOccupationData = async (sheetKey: string): Promise<PvtOccupationRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parsePvtOccupationCSV(text);
    } catch (error) {
      console.error("Error loading PVT occupation data", error);
      throw error;
    }
};
export const fetchEnvironmentalConsumptionData = async (sheetKey: string): Promise<EnvironmentalConsumptionRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parseEnvironmentalConsumptionCSV(text);
    } catch (error) {
      console.error("Error loading environmental consumption data", error);
      throw error;
    }
};


export const fetchPostventaBillingData = async (sheetKey: string): Promise<BillingRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parsePostventaBillingCSV(text);
    } catch (error) {
      console.error("Error loading postventa billing data", error);
      throw error;
    }
};

export const fetchWarrantyData = async (sheetKey: string): Promise<WarrantyRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parseWarrantyCSV(text);
    } catch (error) {
      console.error("Error loading warranty data", error);
      throw error;
    }
};

export const fetchPCGCData = async (sheetKey: string): Promise<PCGCRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parsePCGCCSV(text);
    } catch (error) {
      console.error("Error loading PCGC data", error);
      throw error;
    }
};

export const fetchQualityObjectivesData = async (sheetKey: string): Promise<QualityObjectiveRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parseQualityObjectivesCSV(text);
    } catch (error) {
      console.error("Error loading quality objectives data", error);
      throw error;
    }
};

export const fetchQualityObjectivesSummaryData = async (sheetKey: string): Promise<QualityObjectiveSummaryRecord[]> => {
    if (!sheetKey) return [];
    try {
      const text = await fetchFromProxy(sheetKey);
      return parseQualityObjectivesSummaryCSV(text);
    } catch (error) {
      console.error("Error loading quality objectives summary data", error);
      throw error;
    }
};

export const fetchQualityObjectivesScalesData = async (sheetKey: string): Promise<QualityObjectiveScaleRecord[]> => {
    if (!sheetKey) return [];
    try {
      const text = await fetchFromProxy(sheetKey);
      return parseQualityObjectivesScalesCSV(text);
    } catch (error) {
      console.error("Error loading quality objectives scales data", error);
      throw error;
    }
};

export const fetchHRGradesData = async (sheetKey: string): Promise<CourseGrade[]> => {
    if (!sheetKey) {
        console.warn("fetchHRGradesData: No sheet key provided");
        return [];
    }
    try {
        const text = await fetchFromProxy(sheetKey);
        return parseHRGradesCSV(text);
    } catch (error) {
        console.error("Error loading HR grades data:", error);
        throw error; // Throw instead of returning [] to trigger error UI
    }
};

export const fetchHRRelatorioData = async (sheetKey: string): Promise<RelatorioItem[]> => {
    if (!sheetKey) {
        console.warn("fetchHRRelatorioData: No sheet key provided");
        return [];
    }
    try {
        const text = await fetchFromProxy(sheetKey);
        return parseHRRelatorioCSV(text);
    } catch (error) {
        console.error("Error loading HR relatorio data:", error);
        throw error; // Throw instead of returning [] to trigger error UI
    }
};

export const fetchHRContactsData = async (sheetKey: string): Promise<CollaboratorContact[]> => {
    if (!sheetKey) {
        console.warn("fetchHRContactsData: No sheet key provided");
        return [];
    }
    try {
        const text = await fetchFromProxy(sheetKey);
        return parseHRContactsCSV(text);
    } catch (error) {
        console.error("Error loading HR contacts data:", error);
        throw error;
    }
};

export const fetchCoursePhasesData = async (sheetKey: string): Promise<CoursePhase[]> => {
    if (!sheetKey) {
        console.warn("fetchCoursePhasesData: No sheet key provided");
        return [];
    }
    try {
        const text = await fetchFromProxy(sheetKey);
        return parseCoursePhasesCSV(text);
    } catch (error) {
        console.error("Error loading course phases data:", error);
        throw error;
    }
};



// --- Specific Parsers ---

const parseAutoCSV = (csvText: string): AutoRecord[] => {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(cleanHeader);
  const records: AutoRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const currentLine = rows[i];
    // Allow lenient matching if last column is empty
    if (currentLine.length < headers.length - 1) continue;

    const record: any = { id: `row-${i}` };

    headers.forEach((header, index) => {
      const value = currentLine[index] || '';

      if (index === 10) {
        record.ppt_diarios_k = parseNumber(value);
      }
      if (index === 12) {
        record.servicios_diarios_m = parseNumber(value);
      }

      if (header.includes('mes') && !header.includes('nro')) {
        record.mes = value;
      } else if (header.includes('anio') || header.includes('ano')) {
        record.anio = parseInt(value) || 2026;
      } else if (header.includes('sucursal') || header.includes('taller') || header === 'suc' || header === 'suc.') {
        record.sucursal = value;
      } else if (header.includes('ppt') && header.includes('diario')) {
        record.ppt_diarios = parseNumber(value);
      } else if (header.includes('avance ppt')) {
        record.avance_ppt = parseNumber(value);
      } else if (header.includes('avance servis') || header.includes('avance servicios')) {
        record.servicios_totales = parseNumber(value);
      } else if (header.includes('servis') && header.includes('diario')) {
        record.servicios_diarios = parseNumber(value);
      } else if (header.includes('obj') && header.includes('mensual')) {
        record.objetivo_mensual = parseNumber(value);
      } else if ((header.includes('dia') || header.includes('dÃ­as')) && header.includes('lab')) {
        record.dias_laborables = parseNumber(value);
      }
      record[header] = value;
    });

    if (!record.mes) record.mes = 'Unknown';
    else record.mes = normalizeMonth(record.mes);

    if (!record.anio) record.a…13062 tokens truncated…Any = (value: string, terms: string[]) => terms.some(term => value.includes(term));

const findHeaderIndex = (
    headers: string[],
    candidates: string[],
    options?: { exclude?: string[]; exactOnly?: boolean }
) => {
    const cleanedCandidates = candidates.map(cleanHeader).filter(Boolean);
    const excludedTerms = options?.exclude?.map(cleanHeader).filter(Boolean) ?? [];

    const isExcluded = (header: string) => containsAny(header, excludedTerms);

    const exactMatch = headers.findIndex(header => cleanedCandidates.includes(header));
    if (exactMatch !== -1) return exactMatch;

    if (options?.exactOnly) return -1;

    return headers.findIndex(header => {
        if (isExcluded(header)) return false;

        const normalizedHeader = header.replace(/\s+/g, '');
        return cleanedCandidates.some(candidate => {
            const normalizedCandidate = candidate.replace(/\s+/g, '');
            return (
                header.includes(candidate) ||
                candidate.includes(header) ||
                normalizedHeader.includes(normalizedCandidate) ||
                normalizedCandidate.includes(normalizedHeader)
            );
        });
    });
};

const parseCemOsCSV = (csvText: string): CemOsRecord[] => {
    const rows = parseCSV(csvText);
    if (rows.length < 2) return [];

    const rawHeaders = rows[0];
    const headers = rawHeaders.map(cleanHeader);
    const records: CemOsRecord[] = [];

    const getIdx = (name: string) => {
        const cleaned = cleanHeader(name);
        // Try exact match first
        let idx = headers.indexOf(cleaned);
        if (idx !== -1) return idx;

        // Try partial match
        idx = headers.findIndex(h => h.includes(cleaned) || cleaned.includes(h));
        if (idx !== -1) return idx;

        // Try matching without spaces
        const noSpaces = cleaned.replace(/\s+/g, '');
        return headers.findIndex(h => h.replace(/\s+/g, '').includes(noSpaces));
    };

    const idxMes = getIdx('mes');
    const idxZona = getIdx('Zona');
    const idxCodigo = getIdx('CÃ³digo');
    const idxCanal = getIdx('Canal de Ventas');
    const idxChasis = getIdx('Chasis');
    const idxEntregaFinal = getIdx('Entrega a cliente final');
    const idxEntregaReportada = getIdx('Entrega a cliente reportada');
    const idxVendedor = getIdx('Vendedor');
    const idxNroCliente = getIdx('NÃºmero de cliente');
    const idxNombre = getIdx('Cliente: Nombre');
    const idxApellido = getIdx('Cliente: Apellido');
    const idxDni = getIdx('Cliente: NÃºmero de identificaciÃ³n');
    const idxCalle = getIdx('Cliente: Calle');
    const idxCiudad = getIdx('Cliente: Ciudad');
    const idxCp = getIdx('Cliente: CÃ³digo postal');
    const idxEstado = getIdx('Cliente: Estado');
    const idxCelular = getIdx('Customer: MobilePhone');
    const idxTelCasa = getIdx('Cliente: TelÃ©fono (Casa)');
    const idxTelOficina = getIdx('Cliente: TelÃ©fono (Oficina)');
    const idxEmail = getIdx('Cliente: E-mail');
    const idxFechaDominio = getIdx('Fecha Dominio');
    const idxDominio = getIdx('Dominio');
    const idxMailInterna = getIdx('MAIL Encuesta interna');
    const idxCem = findHeaderIndex(headers, ['CEM OS', 'CEM', 'OS'], { exclude: ['comentario', 'reclamo', 'observacion'] });
    const idxInterna = getIdx('Encuesta Interna');
    const idxTemprana = getIdx('Encuesta TEMPRANA');
    const idxEstadoInterna = getIdx('Estado encuesta interna');
    const idxFechaLinkLlega = getIdx('Fecha en que le llega el link');
    const idxFechaLinkCaduca = getIdx('Fecha en que caduca el link');
    const idxEstadoUnidad = getIdx('Estado de la unidad');
    const idxContactado = getIdx('CONTACTADO?');
    const idxGestionado = getIdx('Â¿GESTIONADO?');
    const idxComentarioInterna = getIdx('COMENTARIO/ RECLAMO interna');
    const idxComentarioCem = getIdx('COMENTARIO/ RECLAMO CEM');

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 5) continue;

        const record: CemOsRecord = {
            id: `cem-os-${i}`,
            mes: normalizeMonth(idxMes !== -1 ? row[idxMes] : ''),
            zona: idxZona !== -1 ? row[idxZona]?.trim() : '',
            codigo: idxCodigo !== -1 ? row[idxCodigo]?.trim() : '',
            canal_ventas: idxCanal !== -1 ? row[idxCanal]?.trim() : '',
            chasis: idxChasis !== -1 ? row[idxChasis] : '',
            entrega_final: idxEntregaFinal !== -1 ? row[idxEntregaFinal] : '',
            entrega_reportada: idxEntregaReportada !== -1 ? row[idxEntregaReportada] : '',
            vendedor: cleanVendedor(idxVendedor !== -1 ? row[idxVendedor] : ''),
            nro_cliente: idxNroCliente !== -1 ? row[idxNroCliente] : '',
            cliente_nombre: idxNombre !== -1 ? row[idxNombre] : '',
            cliente_apellido: idxApellido !== -1 ? row[idxApellido] : '',
            cliente_dni: idxDni !== -1 ? row[idxDni] : '',
            cliente_calle: idxCalle !== -1 ? row[idxCalle] : '',
            cliente_ciudad: idxCiudad !== -1 ? row[idxCiudad] : '',
            cliente_cp: idxCp !== -1 ? row[idxCp] : '',
            cliente_estado: idxEstado !== -1 ? row[idxEstado] : '',
            cliente_celular: idxCelular !== -1 ? row[idxCelular] : '',
            cliente_tel_casa: idxTelCasa !== -1 ? row[idxTelCasa] : '',
            cliente_tel_oficina: idxTelOficina !== -1 ? row[idxTelOficina] : '',
            cliente_email: idxEmail !== -1 ? row[idxEmail] : '',
            fecha_dominio: idxFechaDominio !== -1 ? row[idxFechaDominio] : '',
            dominio: idxDominio !== -1 ? row[idxDominio] : '',
            mail_encuesta_interna: idxMailInterna !== -1 ? row[idxMailInterna] : '',
            cem_score: idxCem !== -1 ? parseScore(row[idxCem]) : null,
            encuesta_interna_score: idxInterna !== -1 ? parseScore(row[idxInterna]) : null,
            encuesta_temprana_score: idxTemprana !== -1 ? parseScore(row[idxTemprana]) : null,
            estado_encuesta_interna: idxEstadoInterna !== -1 ? row[idxEstadoInterna] : '',
            fecha_link_llega: idxFechaLinkLlega !== -1 ? row[idxFechaLinkLlega] : '',
            fecha_link_caduca: idxFechaLinkCaduca !== -1 ? row[idxFechaLinkCaduca] : '',
            estado_unidad: idxEstadoUnidad !== -1 ? row[idxEstadoUnidad] : '',
            contactado: idxContactado !== -1 ? row[idxContactado] : '',
            gestionado: idxGestionado !== -1 ? row[idxGestionado] : '',
            comentario_interna: idxComentarioInterna !== -1 ? row[idxComentarioInterna] : '',
            comentario_cem: idxComentarioCem !== -1 ? row[idxComentarioCem] : '',
        };

        records.push(record);
    }
    return records;
};

export const fetchCemOsData = async (sheetKey: string): Promise<CemOsRecord[]> => {
    try {
      const csvText = await fetchFromProxy(sheetKey);
      return parseCemOsCSV(csvText);
    } catch (error) {
      console.error("Error fetching CEM OS data:", error);
      return [];
    }
};

export const fetchActionPlanData = async (sheetKey: string): Promise<ActionPlanRecord[]> => {
    try {
      const csvText = await fetchFromProxy(sheetKey);
      return parseActionPlanCSV(csvText);
    } catch (error) {
      console.error("Error fetching Action Plan data:", error);
      return [];
    }
};

const parseActionPlanCSV = (csvText: string): ActionPlanRecord[] => {
    const rows = parseCSV(csvText);
    if (rows.length === 0) return [];

    // Find header row dynamically
    let headerIndex = -1;
    let headers: string[] = [];
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i];
        if (row.some(cell => cell?.toLowerCase().includes('nÂº')) && 
            row.some(cell => cell?.toLowerCase().includes('mes')) &&
            row.some(cell => cell?.toLowerCase().includes('kpi'))) {
            headerIndex = i;
            headers = row.map(h => h.toLowerCase().trim());
            break;
        }
    }

    const getIdx = (name: string) => headers.findIndex(h => h.includes(name.toLowerCase()));

    const idxNro = getIdx('nÂº');
    const idxMes = getIdx('mes');
    const idxFechaAlta = getIdx('fecha alta') !== -1 ? getIdx('fecha alta') : getIdx('alta');
    const idxProvincia = getIdx('provincia') !== -1 ? getIdx('provincia') : getIdx('sucursal');
    const idxCaracter = getIdx('carÃ¡cter');
    const idxSector = getIdx('sector');
    const idxOrigen = getIdx('origen');
    const idxNorma = getIdx('norma');
    const idxRequisito = getIdx('requisito');
    const idxNombreKpi = getIdx('nombre kpi') !== -1 ? getIdx('nombre kpi') : getIdx('kpi');
    const idxObjCuant = getIdx('objetivo kpi cuantitativo');
    const idxObjCual = getIdx('objetivo kpi cualitativo');
    const idxSitCuant = getIdx('situaciÃ³n actual cuantitativo');
    const idxSitCual = getIdx('situaciÃ³n actual cualitativo');
    const idxEnviarDesvio = getIdx('enviar desvÃ­o');
    const idxEstado = getIdx('estado');
    const idxCausaRaiz = getIdx('causa raÃ­z');
    const idxAccionInm = getIdx('acciÃ³n inmediata');
    const idxAccionCorr = getIdx('acciÃ³n correctiva');
    const idxResponsable = getIdx('responsable');
    const idxIndEficacia = getIdx('indicador de eficiencia');
    const idxObjInd = getIdx('objetivo indicador');
    const idxFechaIniEst = getIdx('fecha inicio est');
    const idxDurEst = getIdx('duraciÃ³n est');
    const idxIniReal = getIdx('inicio real');
    const idxFinReal = getIdx('finalizaciÃ³n real');
    const idxDurReal = getIdx('duraciÃ³n real');
    const idxEstadoFinal = getIdx('estado final');
    const idxVerifEficacia = getIdx('verificaciÃ³n eficacia');
    const idxFechaVerif = getIdx('fecha verificaciÃ³n');

    // Fallback to index 7 if not found
    const startDataIndex = headerIndex !== -1 ? headerIndex + 1 : 7;
    const records: ActionPlanRecord[] = [];

    for (let i = startDataIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 5) continue;

        const nombreKpi = idxNombreKpi !== -1 ? row[idxNombreKpi]?.trim() : (row[9]?.trim() || '');
        // A row is considered a plan if it has a KPI name or at least some basic info
        const isPlan = nombreKpi !== '' || !!(row[0]?.trim() && row[1]?.trim());

        if (!isPlan) continue;

        const causaRaiz = idxCausaRaiz !== -1 ? row[idxCausaRaiz]?.trim() : (row[16]?.trim() || '');
        const accionInmediata = idxAccionInm !== -1 ? row[idxAccionInm]?.trim() : (row[17]?.trim() || '');
        const accionCorrectiva = idxAccionCorr !== -1 ? row[idxAccionCorr]?.trim() : (row[18]?.trim() || '');

        // Incomplete logic: missing root cause or actions
        const isIncomplete = !!(isPlan && (causaRaiz === '' || accionInmediata === '' || accionCorrectiva === ''));

        const record: ActionPlanRecord = {
            id: `plan-${i}`,
            nro: idxNro !== -1 ? row[idxNro]?.trim() : (row[0]?.trim() || ''),
            mes: normalizeMonth(idxMes !== -1 ? row[idxMes]?.trim() : (row[1]?.trim() || '')),
            fecha_alta: idxFechaAlta !== -1 ? row[idxFechaAlta]?.trim() : (row[2]?.trim() || ''),
            provincia: idxProvincia !== -1 ? row[idxProvincia]?.trim() : (row[3]?.trim() || ''),
            caracter: idxCaracter !== -1 ? row[idxCaracter]?.trim() : (row[4]?.trim() || ''),
            sector: idxSector !== -1 ? row[idxSector]?.trim() : (row[5]?.trim() || ''),
            origen: idxOrigen !== -1 ? row[idxOrigen]?.trim() : (row[6]?.trim() || ''),
            norma: idxNorma !== -1 ? row[idxNorma]?.trim() : (row[7]?.trim() || ''),
            requisito: idxRequisito !== -1 ? row[idxRequisito]?.trim() : (row[8]?.trim() || ''),
            nombre_kpi: nombreKpi,
            objetivo_kpi_cuantitativo: idxObjCuant !== -1 ? row[idxObjCuant]?.trim() : (row[10]?.trim() || ''),
            objetivo_kpi_cualitativo: idxObjCual !== -1 ? row[idxObjCual]?.trim() : (row[11]?.trim() || ''),
            situacion_actual_cuantitativo: idxSitCuant !== -1 ? row[idxSitCuant]?.trim() : (row[12]?.trim() || ''),
            situacion_actual_cualitativo: idxSitCual !== -1 ? row[idxSitCual]?.trim() : (row[13]?.trim() || ''),
            enviar_desvio: idxEnviarDesvio !== -1 ? row[idxEnviarDesvio]?.trim() : (row[14]?.trim() || ''),
            estado: idxEstado !== -1 ? row[idxEstado]?.trim() : (row[15]?.trim() || ''),
            causa_raiz: causaRaiz,
            accion_inmediata: accionInmediata,
            accion_correctiva: accionCorrectiva,
            responsable: idxResponsable !== -1 ? row[idxResponsable]?.trim() : (row[19]?.trim() || ''),
            indicador_eficiencia: idxIndEficacia !== -1 ? row[idxIndEficacia]?.trim() : (row[20]?.trim() || ''),
            objetivo_indicador: idxObjInd !== -1 ? row[idxObjInd]?.trim() : (row[21]?.trim() || ''),
            fecha_inicio_est: idxFechaIniEst !== -1 ? row[idxFechaIniEst]?.trim() : (row[22]?.trim() || ''),
            duracion_est: idxDurEst !== -1 ? row[idxDurEst]?.trim() : (row[23]?.trim() || ''),
            inicio_real: idxIniReal !== -1 ? row[idxIniReal]?.trim() : (row[24]?.trim() || ''),
            finalizacion_real: idxFinReal !== -1 ? row[idxFinReal]?.trim() : (row[25]?.trim() || ''),
            duracion_real: idxDurReal !== -1 ? row[idxDurReal]?.trim() : (row[26]?.trim() || ''),
            estado_final: idxEstadoFinal !== -1 ? row[idxEstadoFinal]?.trim() : (row[27]?.trim() || ''),
            verificacion_eficacia: idxVerifEficacia !== -1 ? row[idxVerifEficacia]?.trim() : (row[28]?.trim() || ''),
            // Monthly tracking AD-AO (indices 29-40)
            seguimiento: {
                'ene': row[29]?.trim() || '',
                'feb': row[30]?.trim() || '',
                'mar': row[31]?.trim() || '',
                'abr': row[32]?.trim() || '',
                'may': row[33]?.trim() || '',
                'jun': row[34]?.trim() || '',
                'jul': row[35]?.trim() || '',
                'ago': row[36]?.trim() || '',
                'sep': row[37]?.trim() || '',
                'oct': row[38]?.trim() || '',
                'nov': row[39]?.trim() || '',
                'dic': row[40]?.trim() || ''
            },
            fecha_verificacion: idxFechaVerif !== -1 ? row[idxFechaVerif]?.trim() : (row[41]?.trim() || ''),
            requiere_modificar_riesgos: row[42]?.trim() || '',
            puede_ocurrir_otra_area: row[43]?.trim() || '',
            isIncomplete,
            isPlan
        };

        records.push(record);
    }
    console.log(`Parsed ${records.length} action plan records. Header found at index ${headerIndex}`);
    return records;
};

export const fetchInternalPostventaData = async (sheetKey: string): Promise<InternalPostventaRecord[]> => {
    try {
      const csvText = await fetchFromProxy(sheetKey);
      return parseInternalPostventaCSV(csvText);
    } catch (error) {
      console.error("Error fetching Internal Postventa data:", error);
      throw error; // Throw instead of returning []
    }
};

export const parseInternalPostventaCSV = (csvText: string): InternalPostventaRecord[] => {
    const rows = parseCSV(csvText);
    if (rows.length < 2) return [];

    const headers = rows[0].map(cleanHeader);
    const records: InternalPostventaRecord[] = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 5) continue;

        const record: any = { id: `ip-row-${i}` };

        headers.forEach((header, index) => {
            const value = row[index] || '';

            if (header === 'or sucur') record.sucursal = normalizeBranch(value);
            else if (header === 'tecnicos') record.tecnicos = value;
            else if (header === 'op nombre') record.asesor = value;
            else if (header === 'or operario') record.operario = value;
            else if (header === 'or codigo') record.codigo = value;
            else if (header === 'or fecini') record.fecha_inicio = value;
            else if (header === 'or fecfin') record.fecha_fin = value;
            else if (header === 'or nombre') record.cliente_nombre = value;
            else if (header === 'ser nombre') record.servicio = value;
            else if (header === 'fv dominio') record.dominio = value;
            else if (header === 'cli telefo') record.telefono = value;
            else if (header === 'cli email') record.email = value;
            else if (header === 'au nombre') record.auto = value;
            else if (header === 'mar nombre') record.marca = value;
            else if (header === 'fv chasis') record.chasis = value;
            else if (header === 'created at') record.created_at = value;
            else if (header === 'estadonombre') record.estado = value;
            else if (header === 'nombre sucursal') {
                record.nombre_sucursal = value;
                record.sucursal = normalizeBranch(value);
            }

            // Scores
            else if (header === 'servicio prestado') record.servicio_prestado = parseScore(value);
            else if (header === 'trato personal') record.trato_personal = parseScore(value);
            else if (header.startsWith('organizacion') && !header.includes('observacion')) record.organizacion = parseScoreInRange(value, 1, 5);
            else if (header === 'trabajo del taller') record.trabajo_taller = parseScore(value);
            else if (header.startsWith('lavado') && !header.includes('observacion')) record.lavado = parseScoreInRange(value, 1, 5);

            // Observations
            else if (header === 'observacion servicio prestado') record.obs_servicio_prestado = value;
            else if (header === 'observacion trato personal') record.obs_trato_personal = value;
            else if (header === 'observacion organizacion') record.obs_organizacion = value;
            else if (header === 'observacion trabajo del taller') record.obs_trabajo_taller = value;
            else if (header === 'observacion lavado') record.obs_lavado = value;

            else if (header === 'tipo contacto') record.tipo_contacto = value;
            else if (header === 'observacion tipo contacto') record.obs_tipo_contacto = value;
            else if (header === 'observaciones') record.observaciones = value;
            else if (header === 'observacion observaciones') record.obs_observaciones = value;

            // The normalized names for Organizacion and Lavado match their raw
            // CSV headers. Do not replace parsed numeric scores with strings.
            if (!(header in record)) record[header] = value;
        });

        record.mes = pickFirstValidMonth(record.fecha_fin, record.created_at, record.mes);
        const periodDate = String(record.fecha_fin || record.created_at || '');
        const yearMatch = periodDate.match(/^(\d{4})[-/]/) || periodDate.match(/^\d{1,2}[-/]\d{1,2}[-/](\d{4})/);
        record.anio = yearMatch ? Number(yearMatch[1]) : 0;
        if (!record.sucursal && record.nombre_sucursal) record.sucursal = normalizeBranch(record.nombre_sucursal);

        records.push(record as InternalPostventaRecord);
    }
    return records;
};

const parseHRGradesCSV = (csvText: string): CourseGrade[] => {
    const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const data = results.data as Record<string, any>[];
    const headers = results.meta.fields || [];

    if (data.length === 0) return [];

    const basicInfoKeys = [
        'ID', 'Colaborador', 'Unidad', 'Area', 'Funcion', 'ICF',
        'Progreso ICF', 'Nombre', 'Sede', 'Departamento', 'Cargo',
        'Puesto', 'Sector', 'Ubicacion', 'Empleado', 'Legajo', 'DNI',
        'Email', 'Correo', 'Estado', 'Ingreso', 'Antiguedad', 'nm_curso',
        'nm_unidad', 'nm_area', 'nm_funcion', 'nm_cargo', 'nm_puesto'
    ];
    const normalizedBasicKeys = new Set(basicInfoKeys.map(normalizeKey));
    const collaboratorMap = new Map<string, CourseGrade>();

    data.forEach((row, index) => {
        const getVal = (possibleKeys: string[], fallbackIndex: number) => {
            const value = getRowValue(row, ...possibleKeys);
            if (value !== undefined && value !== null && String(value).trim() !== '') return value;
            if (headers.length > fallbackIndex) return row[headers[fallbackIndex]];
            return undefined;
        };

        const name = String(getVal(['Colaborador', 'Nombre', 'Empleado'], 1) || 'Sin Nombre');
        if (name.toLowerCase().includes('colaborador') || name === 'C' || name.trim() === '' || name === 'Nombre') return;

        const rawUnit = String(getVal(['Unidad', 'Sede', 'Ubicacion'], 0) || 'Sin Unidad');
        let unit = rawUnit;
        if (rawUnit.includes('3059')) unit = 'Jujuy';
        else if (rawUnit.includes('3087')) unit = 'Salta';

        const area = String(getVal(['Area', 'Departamento', 'Sector'], 2) || 'Sin Area');
        const func = String(getVal(['Funcion', 'Cargo', 'Puesto'], 3) || 'Sin Funcion');
        const icf = parseFloat(String(getVal(['ICF', 'Progreso ICF', 'Indice'], 5) || '0').replace('%', '').replace(',', '.')) || 0;
        const id = String(getVal(['ID', 'Legajo'], 0) || `collab-${index}`);

        const rowCourses: Record<string, number> = {};
        headers.forEach((key, colIdx) => {
            if (colIdx < 7) return;

            const normalizedHeader = normalizeKey(key);
            if (!normalizedBasicKeys.has(normalizedHeader) && key.trim() !== '') {
                const rawVal = String(row[key] || '').trim();
                if (rawVal === '' || rawVal === '-' || rawVal.toLowerCase() === 'n/a') return;

                const val = parseFloat(rawVal.replace('%', '').replace(',', '.').trim());
                if (!isNaN(val)) rowCourses[key] = val;
            }
        });

        const filteredCourses: Record<string, number> = {};
        Object.entries(rowCourses).forEach(([courseName, score]) => {
            if (!courseName.startsWith('_') && !/^\d+$/.test(courseName.trim())) {
                filteredCourses[courseName] = score;
            }
        });

        if (collaboratorMap.has(name)) {
            const existing = collaboratorMap.get(name)!;
            if (!existing.unidad.split(' | ').includes(unit)) existing.unidad += ` | ${unit}`;
            if (!existing.area.split(' | ').includes(area)) existing.area += ` | ${area}`;
            if (!existing.funcion.split(' | ').includes(func)) existing.funcion += ` | ${func}`;

            if (!existing.icfByFunction) existing.icfByFunction = {};
            existing.icfByFunction[func] = Math.max(existing.icfByFunction[func] || 0, icf);

            if (!existing.coursesByFunction) existing.coursesByFunction = {};
            if (!existing.coursesByFunction[func]) existing.coursesByFunction[func] = {};

            Object.entries(filteredCourses).forEach(([courseName, score]) => {
                existing.courses[courseName] = Math.max(existing.courses[courseName] || 0, score);
                existing.coursesByFunction![func][courseName] = Math.max(existing.coursesByFunction![func][courseName] || 0, score);
            });

            const functionValues = Object.values(existing.icfByFunction) as number[];
            existing.icf = Math.round(functionValues.reduce((acc, value) => acc + value, 0) / functionValues.length);
        } else {
            collaboratorMap.set(name, {
                id: `${id}-${name}`,
                colaborador: name,
                unidad: unit,
                area,
                funcion: func,
                icf,
                courses: filteredCourses,
                icfByFunction: { [func]: icf },
                coursesByFunction: { [func]: filteredCourses }
            });
        }
    });

    return Array.from(collaboratorMap.values());
};

const parseHRRelatorioCSV = (csvText: string): RelatorioItem[] => {
    const results = Papa.parse(csvText, { header: false, skipEmptyLines: true });
    const rows = results.data as string[][];

    if (rows.length === 0) return [];

    const firstRow = rows[0];
    const isHeader = firstRow.some(cell =>
        ['nombre', 'colaborador', 'curso', 'fecha', 'clase', 'referencia'].some(header =>
            normalizeKey(cell).includes(header)
        )
    );

    return rows
        .slice(isHeader ? 1 : 0)
        .filter(row => row.length >= 1)
        .map((row, index) => {
            const colC = row[2] || '';

            if (colC.includes('|')) {
                const parts = colC.split('|').map(part => part.trim()).filter(Boolean);
                let curso = parts[1] || row[1] || '';
                let fecha = '';
                let hora = '';

                if (parts.length >= 4) {
                    const lastPart = parts[parts.length - 1];
                    if (lastPart.toLowerCase().includes('hs') || lastPart.includes(':') || /\d+[\.:]\d+/.test(lastPart)) {
                        hora = lastPart;
                        fecha = parts[parts.length - 2];
                    } else {
                        fecha = lastPart;
                    }
                } else if (parts.length === 3) {
                    fecha = parts[2];
                }

                const rawUnit = row[4] || 'Sin Unidad';
                let unit = rawUnit;
                if (rawUnit.includes('3059')) unit = 'Jujuy';
                else if (rawUnit.includes('3087')) unit = 'Salta';

                return {
                    id: `hr-rel-${index}`,
                    referenciaMeses: parts[0] || row[0] || '',
                    curso,
                    clase: colC,
                    claseFecha: fecha || colC,
                    claseHora: hora,
                    nombre: row[3] || 'Sin Nombre',
                    unidad: unit,
                    area: 'Sin Area',
                    fechaRegistro: row[5] || '',
                    linkCurso: row[8] || ''
                };
            }

            const rawUnitFallback = row[4] || row[1] || 'Sin Unidad';
            let unitFallback = rawUnitFallback;
            if (rawUnitFallback.includes('3059')) unitFallback = 'Jujuy';
            else if (rawUnitFallback.includes('3087')) unitFallback = 'Salta';

            return {
                id: `hr-rel-${index}`,
                referenciaMeses: row[0] || '',
                curso: row[1] || '',
                clase: colC,
                claseFecha: row[2] || '',
                claseHora: row[4] || row[3] || '',
                nombre: row[3] || row[0] || 'Sin Nombre',
                unidad: unitFallback,
                area: 'Sin Area',
                fechaRegistro: row[5] || '',
                linkCurso: row[8] || ''
            };
        });
};

const parseHRContactsCSV = (csvText: string): CollaboratorContact[] => {
    const results = Papa.parse(csvText, { header: false, skipEmptyLines: true });
    const rows = results.data as string[][];

    return rows
        .filter(row => row.length >= 2 && row[0] && row[1])
        .map(row => ({
            nombre: row[0].trim(),
            telefono: row[1].trim()
        }));
};

const parseCoursePhasesCSV = (csvText: string): CoursePhase[] => {
    const results = Papa.parse(csvText, { header: false, skipEmptyLines: true });
    const rows = results.data as string[][];

    if (rows.length < 2) return [];

    return rows.slice(1)
        .filter(row => row[0])
        .map(row => ({
            curso: (row[0] || '').trim(),
            fase: (row[1] || 'Otros').trim() || 'Otros',
            modalidad: (row[2] || 'Sin Modalidad').trim() || 'Sin Modalidad'
        }));
};

const parseScoringCSV = (csvText: string): ScoringRecord[] => {
    const parsed = Papa.parse<Record<string, unknown>>(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
    });

    const normalizeHeader = (value: string) => cleanHeader(value).replace(/\s+/g, '_');
    const valueFor = (row: Record<string, unknown>, ...keys: string[]) => {
      const normalizedRow = new Map(
        Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? '').trim()])
      );
      for (const key of keys) {
        const value = normalizedRow.get(key);
        if (value) return value;
      }
      return '';
    };

    return parsed.data
      .filter((row) => Object.values(row).some((value) => String(value ?? '').trim() !== ''))
      .map((row, index) => {
        const customerId = valueFor(row, 'id_cliente');
        const branchSource = customerId.toUpperCase();
        const branch: ScoringRecord['branch'] = branchSource.startsWith('JUJUY-')
          ? 'JUJUY'
          : branchSource.startsWith('SALTA-')
            ? 'SALTA'
            : 'SIN SUCURSAL';

        return {
          id: valueFor(row, 'id_respuesta') || `scoring-row-${index + 1}`,
          customerId,
          dniHash: valueFor(row, 'dni_hash'),
          responseDate: valueFor(row, 'fecha_respuesta', 'fecha'),
          customerName: valueFor(row, 'nombre_y_apellido', 'nombre_apellido', 'cliente'),
          model: valueFor(row, 'modelo_suscripto', 'modelo'),
          branch,
          q1: valueFor(row, 'q1_conocia_plan_exclusivo'),
          q2: valueFor(row, 'q2_informaron_licitacion_cuota_2'),
          q3: valueFor(row, 'q3_informaron_adjudicacion_asegurada'),
          q4: valueFor(row, 'q4_informaron_monto_cuota_2'),
          q4aEstimatedAmount: valueFor(row, 'q4a_monto_estimado_cuota_2'),
          q5FirstInstallment: valueFor(row, 'q5_monto_primera_cuota'),
          q5aAutoDebit: valueFor(row, 'q5a_acepto_debito_automatico'),
          q5bFirstPaymentDate: valueFor(row, 'q5b_fecha_pago_primera_cuota'),
          advisor: valueFor(row, 'q6_quien_es_vendedor', 'vendedor', 'asesor'),
          q7OtherPlan: valueFor(row, 'q7_tuvo_otro_plan_reciente'),
          q7aOtherPlanDetail: valueFor(row, 'q7a_detalle_otro_plan'),
          q8ProposalOrigin: valueFor(row, 'q8_como_conocio_propuesta'),
          q9NeedsContact: valueFor(row, 'q9_necesita_recontacto'),
          q10CustomerObservation: valueFor(row, 'q10_observaciones_cliente', 'observaciones_cliente'),
          scoringResult: valueFor(row, 'resultado_scoring'),
          scoringReason: valueFor(row, 'motivo_resultado'),
          requiresContact: valueFor(row, 'requiere_recontacto'),
          areaToReview: valueFor(row, 'area_a_revisar'),
          internalObservation: valueFor(row, 'observacion_interna'),
        };
      });
};

const parseEnvironmentalPeriod = (
  rawPeriod: string,
  rawMonth: string,
  rawYear: string
) => {
  const monthAliases: Record<string, number> = {
    ene: 1, enero: 1,
    feb: 2, febrero: 2,
    mar: 3, marzo: 3,
    abr: 4, abril: 4,
    may: 5, mayo: 5,
    jun: 6, junio: 6,
    jul: 7, julio: 7,
    ago: 8, agosto: 8,
    sep: 9, sept: 9, septiembre: 9, set: 9,
    oct: 10, octubre: 10,
    nov: 11, noviembre: 11,
    dic: 12, diciembre: 12,
  };

  const periodValue = String(rawPeriod || '').trim();
  const monthValue = String(rawMonth || '').trim();
  const yearValue = String(rawYear || '').trim();
  const monthTokens = [monthValue, periodValue]
    .flatMap(value => cleanHeader(value).split(/[^a-z]+/))
    .filter(Boolean);

  let mesNumero = monthTokens
    .map(token => monthAliases[token])
    .find((value): value is number => Boolean(value)) || 0;

  if (!mesNumero) {
    const isoMatch = periodValue.match(/\b20\d{2}[-/](0?[1-9]|1[0-2])\b/);
    const alternateMatch = periodValue.match(/\b(0?[1-9]|1[0-2])[-/]20\d{2}\b/);
    mesNumero = Number(isoMatch?.[1] || alternateMatch?.[1] || 0);
  }

  let anio = 0;
  for (const candidate of [yearValue, periodValue]) {
    const fullYear = candidate.match(/\b(20\d{2})\b/);
    if (fullYear) {
      anio = Number(fullYear[1]);
      break;
    }

    const shortYear = candidate.match(/(?:^|[^0-9])([0-9]{2})(?:$|[^0-9])/);
    if (shortYear) {
      anio = 2000 + Number(shortYear[1]);
      break;
    }
  }

  return {
    mes: mesNumero ? SPANISH_MONTHS[mesNumero - 1] : 'Unknown',
    mesNumero,
    anio,
  };
};

const parseEnvironmentalConsumptionCSV = (csvText: string): EnvironmentalConsumptionRecord[] => {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(cleanHeader);
  const records: EnvironmentalConsumptionRecord[] = [];

  const matches = (header: string, value: string) => header.includes(value);

  for (let index = 1; index < rows.length; index++) {
    const currentLine = rows[index];
    if (!currentLine || currentLine.every(cell => !String(cell || '').trim())) continue;

    const getCell = (matcher: (header: string) => boolean) => {
      const columnIndex = headers.findIndex(matcher);
      return columnIndex === -1 ? '' : String(currentLine[columnIndex] || '').trim();
    };
    const getNumber = (matcher: (header: string) => boolean) => parseNumber(getCell(matcher));

    const empresa = getCell(header => header === 'empresa' || matches(header, 'empresa'));
    if (!empresa || normalizeKey(empresa) === 'total') continue;

    const rawMonth = getCell(header => header === 'mes');
    const rawYear = getCell(header => header === 'ano' || header === 'anio');
    const rawPeriod = getCell(header => matches(header, 'periodo')) || rawYear;
    const parsedPeriod = parseEnvironmentalPeriod(rawPeriod, rawMonth, rawYear);

    if (!parsedPeriod.anio || !parsedPeriod.mesNumero) continue;

    const total = getNumber(header => header === 'total' || header === 'total general');
    const consumoEnergiaRaw = getCell(header =>
      matches(header, 'consumo de energia') && !matches(header, 'indicador')
    );
    const consumoAguaRaw = getCell(header =>
      matches(header, 'consumo de agua') && !matches(header, 'indicador')
    );
    const consumoEnergiaKwh = parseNumber(consumoEnergiaRaw);
    const consumoAguaM3 = parseNumber(consumoAguaRaw);
    const indicadorEnergiaRaw = getCell(header =>
      matches(header, 'indicador') && matches(header, 'energia')
    );
    const indicadorAguaRaw = getCell(header =>
      matches(header, 'indicador') && matches(header, 'agua')
    );

    records.push({
      id: 'environment-row-' + index,
      empresa: empresa.replace(/\s+/g, ' ').trim(),
      periodo: rawPeriod || (parsedPeriod.mes + '-' + parsedPeriod.anio),
      mes: parsedPeriod.mes,
      mesNumero: parsedPeriod.mesNumero,
      anio: parsedPeriod.anio,
      totalUnidadesServicio: getNumber(header =>
        matches(header, 'unidades de servicio') || header === 'tus'
      ),
      entregas0Km: getNumber(header => matches(header, 'entregas') && matches(header, '0km')),
      unidades: getNumber(header => header === 'unidades'),
      panos: getNumber(header => header === 'panos'),
      total,
      consumoEnergiaKwh,
      consumoAguaM3,
      tieneFacturaEnergia: Boolean(consumoEnergiaRaw),
      tieneFacturaAgua: Boolean(consumoAguaRaw),
      indicadorEnergia: indicadorEnergiaRaw ? parseNumber(indicadorEnergiaRaw) : (consumoEnergiaRaw && total > 0 ? consumoEnergiaKwh / total : 0),
      indicadorAgua: indicadorAguaRaw ? parseNumber(indicadorAguaRaw) : (consumoAguaRaw && total > 0 ? consumoAguaM3 / total : 0),
    });
  }

  return records;
};

