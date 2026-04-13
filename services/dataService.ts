
/// <reference types="vite/client" />
import Papa from 'papaparse';
import { AutoRecord, QualityRecord, SalesQualityRecord, SalesClaimsRecord, DetailedQualityRecord, PostventaKpiRecord, BillingRecord, PCGCRecord, CemOsRecord, InternalPostventaRecord, ActionPlanRecord, CourseGrade, RelatorioItem, CollaboratorContact, CoursePhase } from '../types';
import { buildApiUrl } from './apiConfig';

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
    if (s.includes('MOVIL')) return 'TALLER MOVIL';
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
        'sep': 'Septiembre', 'sep.': 'Septiembre', 'septiembre': 'Septiembre',
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

    const directMonth = normalizeMonth(clean);
    if (SPANISH_MONTHS.includes(directMonth)) return directMonth;

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

    return 'Unknown';
};

const pickFirstValidMonth = (...values: Array<string | undefined>) => {
    for (const value of values) {
        if (!value) continue;
        const normalized = normalizeMonth(value);
        if (SPANISH_MONTHS.includes(normalized)) return normalized;
        const extracted = extractMonthFromDateString(value);
        if (SPANISH_MONTHS.includes(extracted)) return extracted;
    }
    return 'Unknown';
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

// Helper for scores that can be null (not 0)
const parseScore = (val: string): number | null => {
    if (!val || val.trim() === '' || val.trim() === '-') return null;
    const num = parseNumber(val);
    return num === 0 ? null : num; // Assuming 0 usually means no score in this context, unless specified
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
const BACKEND_WAKE_TIMEOUT_MS = 12000;
const RETRYABLE_PROXY_ATTEMPTS = 2;

let backendWakePromise: Promise<void> | null = null;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
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

const fetchFromProxy = async (sheetKey: string): Promise<string> => {
    await wakeBackendIfNeeded();

    // If it's a full URL, pass it as a query parameter to our proxy to avoid CORS
    const url = sheetKey.startsWith('http') 
        ? buildApiUrl(`/api/data/custom?url=${encodeURIComponent(sheetKey)}`) 
        : buildApiUrl(`/api/data/${sheetKey}`);
    
    console.log(`[DataService] Fetching from: ${url}`);

    let lastError: unknown;

    for (let attempt = 1; attempt <= RETRYABLE_PROXY_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PROXY_REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(url, { 
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
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
            return await response.text();
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
      console.error("Error loading detailed quality data", error);
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

export const fetchPostventaBillingData = async (sheetKey: string): Promise<BillingRecord[]> => {
    try {
      const text = await fetchFromProxy(sheetKey);
      return parsePostventaBillingCSV(text);
    } catch (error) {
      console.error("Error loading postventa billing data", error);
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
      } else if ((header.includes('dia') || header.includes('días')) && header.includes('lab')) {
        record.dias_laborables = parseNumber(value);
      }
      record[header] = value;
    });

    if (!record.mes) record.mes = 'Unknown';
    else record.mes = normalizeMonth(record.mes);

    if (!record.anio) record.anio = 2026;
    record.sucursal = normalizeBranch(record.sucursal);

    // Initial Defaults
    if (record.ppt_diarios === undefined) record.ppt_diarios = 0;
    if (record.avance_ppt === undefined) record.avance_ppt = 0;
    if (record.servicios_diarios === undefined) record.servicios_diarios = 0;
    if (record.servicios_totales === undefined) record.servicios_totales = 0;
    if (record.objetivo_mensual === undefined) record.objetivo_mensual = 0;
    if (record.dias_laborables === undefined) record.dias_laborables = 0;

    records.push(record as AutoRecord);
  }
  return records;
};

const parseQualityCSV = (csvText: string): QualityRecord[] => {
    const rows = parseCSV(csvText);
    if (rows.length < 2) return [];
  
    const headers = rows[0].map(cleanHeader);
    const companyIdx = headers.indexOf('nombre de la compania');
    const apellidoIdx = headers.indexOf('apellido');
    const nombreIdx = headers.indexOf('nombre');

    const records: QualityRecord[] = [];
  
    for (let i = 1; i < rows.length; i++) {
      const currentLine = rows[i];
      if (currentLine.length < headers.length - 1) continue;
  
      const record: any = { id: `q-row-${i}` };
      
      headers.forEach((header, index) => {
        const value = currentLine[index] || '';
  
        // Strict mapping based on user feedback
        if (header.includes('sucursal') || header.includes('taller')) record.sucursal = value;
        else if (header.includes('mes')) record.mes = value;
        else if (header.includes('anio') || header.includes('ano')) record.anio = parseInt(value) || 2026;
        else if (header === 'cliente') record.cliente = value;
        else if (header.includes('sector')) record.sector = value;
        else if (header.includes('motivos')) record.motivo = value;
        else if (header.includes('responsable de')) record.responsable = value;
        else if (header.includes('asesor asignado') || header === 'asesor') record.asesor = value;
        else if (header.includes('observación') || header.includes('observacion')) {
            if (!header.includes('resolucion')) {
                record.observacion = value;
            }
        }
        else if (header.includes('estado')) record.estado = value;
        else if (header === 'orden' || header === 'nro' || header === 'or') record.orden = value;

        else if (header.includes('resuelto')) record.resuelto = value;
        else if (header.includes('resolucion') || header.includes('resolución')) record.observacion_resolucion = value;
        else if (header.includes('categorizacion')) record.categorizacion = value;
        else if (header.includes('causa raiz')) record.causa_raiz = value;
        else if (header.includes('accion contencion')) record.accion_contencion = value;
        else if (header.includes('accion correctiva')) record.accion_correctiva = value;
        
        record[header] = value;
      });
  
      // Client name construction
      if (!record.cliente) {
          const company = companyIdx !== -1 ? currentLine[companyIdx] : '';
          const ape = apellidoIdx !== -1 ? currentLine[apellidoIdx] : '';
          const nom = nombreIdx !== -1 ? currentLine[nombreIdx] : '';
          
          if (company && company.trim() !== '') {
              record.cliente = company.trim();
          } else if (ape || nom) {
              record.cliente = `${ape} ${nom}`.trim();
          } else {
              record.cliente = 'Cliente Desconocido';
          }
      }

      if (!record.observacion && record['reclamo / observación']) record.observacion = record['reclamo / observación'];

      if (!record.sucursal) record.sucursal = 'General';
      else record.sucursal = normalizeBranch(record.sucursal);

      if (!record.mes) record.mes = 'Unknown';
      else record.mes = normalizeMonth(record.mes); 

      if (!record.anio) record.anio = 2026; 
      if (!record.sector) record.sector = 'Sin Sector';
      if (!record.motivo) record.motivo = 'Sin Motivo';
      
      if (record.orden) record.orden = record.orden.toString().trim();

      records.push(record as QualityRecord);
    }
    return records;
  };

const parseSalesQualityCSV = (csvText: string): SalesQualityRecord[] => {
    const rows = parseCSV(csvText);
    if (rows.length < 2) return [];
  
    const headers = rows[0].map(cleanHeader);
    const records: SalesQualityRecord[] = [];
  
    for (let i = 1; i < rows.length; i++) {
      const currentLine = rows[i];
      if (currentLine.length < headers.length - 1) continue;
  
      const record: any = { id: `sq-row-${i}` };
      
      headers.forEach((header, index) => {
        const value = currentLine[index] || '';

        if (!record.mes && index === 0 && isKnownMonth(value)) {
            record.mes = value;
        }

        // TIPO DE VENTA
        if (header.includes('tipo de venta') || header === 'canal' || header === 'origen') {
            record.tipo_venta = value;
        }

        // CONTACT DATES
        if (header.includes('fecha de entrega') || (header.includes('fecha') && header.includes('entrega'))) record.fecha_entrega = value;
        else if (header.includes('fecha 1') || header.includes('1º llamado')) record.fecha_1_llamado = value;
        else if (header.includes('fecha 2') || header.includes('2º llamado')) record.fecha_2_llamado = value;
        else if (header.includes('fecha 3') || header.includes('3º llamado')) record.fecha_3_llamado = value;
        else if (header.includes('contacto efectivo')) record.fecha_contacto_efectivo = value;
        else if (header.includes('envío mensaje')) record.fecha_envio_wpp = value;
        else if (header.includes('respuesta mensaje')) record.fecha_respuesta_wpp = value;

        // STANDARD FIELDS
        else if (header.includes('mes de entrega') || header === 'mes') record.mes = value;
        else if (header.includes('anio') || header.includes('ano')) record.anio = parseInt(value) || 2026;
        else if (header.includes('sucursal')) record.sucursal = value;
        else if (header.includes('modelo')) record.modelo = value;
        else if (header.includes('vendedor')) record.vendedor = value;
        else if (header.includes('nombre de cliente') || header === 'cliente') record.cliente = value;
        else if (header.includes('vin') || header === 'chasis') record.vin = value;
        
        // ESTADO (Col N)
        else if (header === 'estado') record.estado = value; 
        
        // NPS - Recomendaría
        else if (header.includes('recomiendes') || header.includes('recomendarías')) record.nps = parseScore(value);

        // COMENTARIOS
        else if (header.includes('comentarios') || header.includes('seguimiento')) {
             if (!record.comentarios) record.comentarios = value;
        }

        // CEM Scores (Parse Score handles nulls)
        else if (header.includes('asesoramiento') && header.includes('cem')) record.cem_asesoramiento = parseScore(value);
        else if (header.includes('organizacion') && header.includes('cem')) record.cem_organizacion = parseScore(value);
        else if (header.includes('trato') && header.includes('cem')) record.cem_trato = parseScore(value);
        else if (header.includes('satisfaccion general') && header.includes('cem')) record.cem_general = parseScore(value);
        
        // Yes/No & Process
        else if (header.includes('prueba de manejo')) record.prueba_manejo = value;
        else if (header.includes('financiar') || header.includes('financiacion')) record.ofrecimiento_financiacion = value;
        else if (header.includes('usado') && header.includes('parte de pago')) record.toma_usados = value;
        else if (header.includes('contacto') && header.includes('despues de la entrega')) record.contacto_entrega = value;
        
        // Admin / Delivery
        else if (header.includes('tramites') && header.includes('explicacion')) record.explicacion_tramites = parseScore(value); 
        else if (header.includes('plazo de entrega')) record.plazo_entrega = parseScore(value);
        else if (header.includes('estado del vehiculo') || (header.includes('danos') && header.includes('pintura'))) record.estado_vehiculo = parseScore(value);
        else if (header.includes('explicacion') && header.includes('funcionamiento')) record.explicacion_entrega = parseScore(value);
        else if (header.includes('seguro')) record.ofrecimiento_seguro = value;
        else if (header.includes('app') && header.includes('vw')) record.app_mi_vw = value;

        record[header] = value;
      });

      // Normalization
      if (!record.mes || normalizeMonth(record.mes) === 'Unknown') {
        record.mes = pickFirstValidMonth(
          record.mes,
          record.fecha_entrega,
          record.fecha_contacto_efectivo,
          record.fecha_1_llamado
        );
      }

      if (!record.mes || record.mes === 'Unknown') record.mes = 'Unknown';
      else record.mes = normalizeMonth(record.mes);
      
      record.sucursal = normalizeBranch(record.sucursal);
      record.anio = 2026; 
      
      if (!record.tipo_venta) record.tipo_venta = 'Otro';
      
      // Filter by VIN: Only records with a valid VIN are counted as real surveys
      if (record.vin && record.vin.trim() !== "" && record.vin !== "0") {
        records.push(record as SalesQualityRecord);
      }
    }
    return records;
};

const parseSalesClaimsCSV = (csvText: string): SalesClaimsRecord[] => {
    const rows = parseCSV(csvText);
    if (rows.length < 2) return [];
  
    const headers = rows[0].map(cleanHeader);
    const records: SalesClaimsRecord[] = [];
    let lastKnownMonth = '';
  
    for (let i = 1; i < rows.length; i++) {
      const currentLine = rows[i];
      if (!currentLine || currentLine.every(cell => !String(cell || '').trim())) continue;
  
      const record: any = { id: `sc-row-${i}` };
      
      headers.forEach((header, index) => {
        const value = currentLine[index] || '';

        if (!record.mes && index === 0 && isKnownMonth(value)) {
            record.mes = value;
        }

        if (header === 'nro de r') record.nro_r = value;
        else if (header === 'numero de vin' || header === 'vin') record.vin = value;
        else if (header === 'receptor') record.receptor = value;
        else if (header === 'fecha reclamo/ queja' || header === 'fecha reclamo') record.fecha_reclamo = value;
        else if (header === 'fecha de finalizacion' || (header.includes('fecha') && header.includes('finalización'))) record.fecha_finalizacion = value;
        else if (header === 'mes de entrega') record.mes = value;
        else if (header === 'anio' || header === 'ano') record.anio = parseInt(value) || 2026;
        else if (header === 'tipo de venta') record.tipo_venta = value;
        else if (header === 'cliente') record.cliente = value;
        else if (header === 'sucursal') record.sucursal = value;
        else if (header === 'categorizacion del cliente' || header.includes('categorización')) record.categoria_cliente = value;
        else if (header === 'reclamo / observacion' || header === 'reclamo / observación' || header === 'observacion') record.reclamo = value;
        else if (header === 'sector resp.' || header === 'sector resp') record.sector = value;
        else if (header === 'responsable del tratamiento') record.responsable = value;
        else if (header === 'identificacion del problema') record.identificacion_problema = value;
        else if (header === 'analisis de causa') record.analisis_causa = value;
        else if (header === 'accion contencion') record.accion_contencion = value;
        else if (header === 'accion preventiva') record.accion_preventiva = value;
        else if (header === 'accion efectiva (1: si - 0: no)' || header.includes('acción efectiva')) record.accion_efectiva = value;
        else if (header === 'evidencia de efectividad / comentarios del cliente' || header.includes('evidencia') || header.includes('comentarios del cliente')) record.evidencia = value;
        else if (header === 'dias de demora') record.dias_demora = parseNumber(value);
        else if (header === 'estado de analisis') record.estado_analisis = value;
        else if (header === 'motivos de reclamo') record.motivo = value;
        else if (header === 'estado de reclamo' || header === 'estado') record.estado = value;

        record[header] = value;
      });

      if ((!record.mes || normalizeMonth(record.mes) === 'Unknown') && lastKnownMonth) {
        record.mes = lastKnownMonth;
      }

      if (!record.mes || normalizeMonth(record.mes) === 'Unknown') {
        record.mes = pickFirstValidMonth(record.mes, record.fecha_reclamo, record.fecha_finalizacion);
      }

      if (!record.mes || record.mes === 'Unknown') record.mes = 'Unknown';
      else {
        record.mes = normalizeMonth(record.mes);
        lastKnownMonth = record.mes;
      }
      
      record.sucursal = normalizeBranch(record.sucursal);

      // Filter by VIN: Only records with a valid VIN are counted as real claims
      if (record.vin && record.vin.trim() !== "" && record.vin !== "0") {
        records.push(record as SalesClaimsRecord);
      }
    }
    return records;
};

const parseDetailedQualityCSV = (csvText: string): DetailedQualityRecord[] => {
    const rows = parseCSV(csvText);
    if (rows.length < 2) return [];
  
    const headers = rows[0].map(cleanHeader);
    const isCompactSaltaFormat = headers.includes('clave f') && headers.includes('concat t ac');
    const isFlatSaltaFormat =
        headers.includes('concesionario') &&
        headers.includes('codigo id asesor de servicio') &&
        headers.includes('orden de reparacion');
    const companyIdx = headers.indexOf('nombre de la compania');
    const apellidoIdx = headers.indexOf('apellido');
    const nombreIdx = headers.indexOf('nombre');
    
    const records: DetailedQualityRecord[] = [];
  
    const cleanAsesorName = (name: string) => {
        if (!name) return 'Sin Asesor';
        // Remove numbers and extra spaces
        return name.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
    };

    const parseCompactScores = (value: string) => {
        const matches = value.match(/\b[1-5]\b/g) || [];
        const numericScores = matches.map(match => parseInt(match, 10)).filter(score => score >= 1 && score <= 5);
        return {
            q1: numericScores[0] ?? null,
            q2: numericScores[1] ?? null,
            q3: numericScores[2] ?? null,
            q4: numericScores[3] ?? numericScores[numericScores.length - 1] ?? null,
            q6: numericScores[4] ?? null
        };
    };

    if (isCompactSaltaFormat) {
        const idxClave = headers.indexOf('clave f');
        const idxEstado = headers.indexOf('estado r');
        const idxConcat = headers.indexOf('concat t ac');

        for (let i = 1; i < rows.length; i++) {
            const currentLine = rows[i];
            if (currentLine.length === 0) continue;

            const codId = idxClave !== -1 ? (currentLine[idxClave] || '').trim() : '';
            if (!codId) continue;

            const concatValue = idxConcat !== -1 ? (currentLine[idxConcat] || '').trim() : '';
            const scores = parseCompactScores(concatValue);

            const record: DetailedQualityRecord = {
                id: `dq-row-${i}`,
                sucursal: 'SALTA',
                mes: 'Unknown',
                cod_id: codId,
                fecha_servicio: '',
                vin: '',
                modelo: '',
                cliente: `Registro ${codId}`,
                orden: codId,
                asesor: 'Sin Asesor',
                q1_score: scores.q1,
                q1_comment: '',
                q2_score: scores.q2,
                q2_comment: '',
                q3_score: scores.q3,
                q3_comment: '',
                q4_score: scores.q4,
                q4_comment: concatValue,
                q6_score: null,
                q7_score: null,
                q8_val: '',
                comentario_cliente: concatValue,
                estado_cliente: idxEstado !== -1 ? (currentLine[idxEstado] || '').trim() : '',
                categorizacion: '',
            };

            records.push(record);
        }

        return records;
    }

    for (let i = 1; i < rows.length; i++) {
      const currentLine = rows[i];
      if (currentLine.length < 5) continue; 

      const record: any = { id: `dq-row-${i}` };
      
      headers.forEach((header, index) => {
        const value = currentLine[index] || '';
        // Store all raw values but don't let them overwrite our mapped fields easily
        if (!record[header]) record[header] = value; 

        // Map by exact cleaned header name
        if (header.includes('mes')) record.mes = normalizeMonth(value);
        else if (header === 'concesionario') record.sucursal = normalizeBranch(value);
        else if (header.includes('codid') || header.includes('cod id')) record.cod_id = value.trim();
        else if (header.includes('codigo id asesor de servicio')) record.cod_id = value.trim();
        else if (header.includes('fecha de servicio') || header.includes('fecha servicio')) record.fecha_servicio = value;
        else if (header.includes('vin') || header.includes('chasis')) record.vin = value;
        else if (header.includes('modelo')) record.modelo = value;
        else if (header.includes('or') || header.includes('orden')) record.orden = value;
        else if (header.includes('asesor')) record.asesor = cleanAsesorName(value);
        else if (header.includes('apellido asesor de servicio')) record.asesor_apellido = value.trim();
        else if (header.includes('nombre asesor de servicio')) record.asesor_nombre = value.trim();
        
        // Scores - Matching the user's specific header structure
        else if (header.includes('trato personal') && header.includes('(q1)')) record.q1_score = parseScore(value);
        else if (header === 'comentario 1') record.q1_comment = value;
        
        else if (header.includes('organizacion') && header.includes('(q2)')) record.q2_score = parseScore(value);
        else if (header === 'comentario 2') record.q2_comment = value;
        
        else if (header.includes('calidad de reparacion') && header.includes('(q3)')) record.q3_score = parseScore(value);
        else if (header === 'comentario 3') record.q3_comment = value;
        
        else if (header.includes('lvs') && header.includes('(q4)')) record.q4_score = parseScore(value);
        else if (header === 'comentario 4') record.q4_comment = value;
        
        else if (header === 'q6') record.q6_score = parseScore(value);
        else if (header === 'q7') record.q7_score = parseScore(value);
        else if (header === 'q8') record.q8_val = value;
        
        else if (header === 'comentario del cliente') record.comentario_cliente = value;
        else if (header === 'estado cliente') record.estado_cliente = value;
        else if (header === 'categorizacion') record.categorizacion = value;
        else if (header.includes('comentario interna')) record.comentario_interno = value;
        else if (header === 'estado') record.estado_cliente = value;
      });

      // Client name construction using the FIRST occurrence of these headers
      const company = companyIdx !== -1 ? currentLine[companyIdx] : '';
      const ape = apellidoIdx !== -1 ? currentLine[apellidoIdx] : '';
      const nom = nombreIdx !== -1 ? currentLine[nombreIdx] : '';
      
      if (company && company.trim() !== '') {
          record.cliente = company.trim();
      } else if (ape || nom) {
          record.cliente = `${ape} ${nom}`.trim();
      } else {
          record.cliente = 'Cliente Desconocido';
      }

      if ((!record.asesor || record.asesor === 'Sin Asesor') && (record.asesor_apellido || record.asesor_nombre)) {
          record.asesor = cleanAsesorName(`${record.asesor_apellido || ''} ${record.asesor_nombre || ''}`.trim());
      }

      if (isFlatSaltaFormat) {
          const internalComment = String(record.comentario_interno || '').trim();
          const parsedScores = parseCompactScores(internalComment);

          if (record.q1_score == null) record.q1_score = parsedScores.q1;
          if (record.q2_score == null) record.q2_score = parsedScores.q2;
          if (record.q3_score == null) record.q3_score = parsedScores.q3;
          if (record.q4_score == null) record.q4_score = parsedScores.q4;
          if (record.q6_score == null) record.q6_score = parsedScores.q6;

          if (!record.q1_comment) record.q1_comment = internalComment;
          if (!record.q2_comment) record.q2_comment = internalComment;
          if (!record.q3_comment) record.q3_comment = internalComment;
          if (!record.q4_comment) record.q4_comment = internalComment;
          if (!record.comentario_cliente) record.comentario_cliente = internalComment;
      }

      // Ensure mandatory fields have defaults
      if (!record.mes || record.mes === 'Unknown') record.mes = pickFirstValidMonth(record.fecha_servicio, record.mes);
      if (!record.sucursal && isFlatSaltaFormat) record.sucursal = 'SALTA';
      if (!record.asesor) record.asesor = 'Sin Asesor';
      if (!record.orden) record.orden = '—';

      records.push(record as DetailedQualityRecord);
    }
    // Filter out records without a valid CodID or VIN
    return records.filter(r => (r.cod_id && r.cod_id.trim() !== "" && r.cod_id !== "0") || (r.vin && r.vin.trim() !== "" && r.vin !== "0"));
};

const parsePostventaKpiCSV = (csvText: string): PostventaKpiRecord[] => {
    const rows = parseCSV(csvText);
    if (rows.length < 2) return [];

    const headers = rows[0].map(cleanHeader);
    const records: PostventaKpiRecord[] = [];

    for (let i = 1; i < rows.length; i++) {
        const currentLine = rows[i];
        if (currentLine.length < 2) continue;

        const record: any = { id: `pkpi-row-${i}` };
        
        headers.forEach((header, index) => {
            const value = currentLine[index] || '';

            if (header.includes('sucursal') || header.includes('unidad')) record.sucursal = normalizeBranch(value);
            else if (header.includes('mes')) record.mes = normalizeMonth(value);
            else if (header.includes('anio') || header.includes('ano')) record.anio = parseInt(value) || 2026;
            else if (header.includes('lvs')) record.lvs = parseNumber(value);
            else if (header.includes('email validos')) record.email_validos = parseNumber(value);
            else if (header.includes('tasa de repuesta') || header.includes('tasa de respuesta')) record.tasa_respuesta = parseNumber(value);
            else if (header.includes('dac')) record.dac = parseNumber(value);
            else if (header.includes('contrato mantenimiento')) record.contrato_mantenimiento = parseNumber(value);
            else if (header.includes('reporte tecnico')) record.reporte_tecnico = parseNumber(value);
            else if (header.includes('reporte garantia')) record.reporte_garantia = parseNumber(value);
            else if (header.includes('ampliacion de trabajo')) record.ampliacion_trabajo = parseNumber(value);
            else if (header.includes('ppt diario')) record.ppt_diario = parseNumber(value);
            else if (header.includes('conversion ppt vs serv')) record.conversion_ppt_serv = parseNumber(value);
            else if (header.includes('oudi servicios')) record.oudi_servicios = parseNumber(value);
            else if (header.includes('costos controlables')) record.costos_controlables = parseNumber(value);
            else if (header.includes('costo sueldos')) record.costo_sueldos = parseNumber(value);
            else if (header.includes('stock muerto')) record.stock_muerto = parseNumber(value);
            else if (header.includes('meses de stock')) record.meses_stock = parseNumber(value);
            else if (header.includes('cotizacion seguros')) record.cotizacion_seguros = parseNumber(value);
            else if (header.includes('uodi repuestos')) record.uodi_repuestos = parseNumber(value);
            else if (header.includes('uodi posventa')) record.uodi_posventa = parseNumber(value);
            else if (header.includes('incentivo calidad')) record.incentivo_calidad = parseNumber(value);
            else if (header.includes('plan incentivo posventa')) record.plan_incentivo_posventa = parseNumber(value);
            else if (header.includes('plan incentivo repuestos')) record.plan_incentivo_repuestos = parseNumber(value);
            else if (header.includes('uops total')) record.uops_total = parseNumber(value);
            
            record[header] = value;
        });

        if (record.mes && record.mes !== 'Unknown') {
            records.push(record as PostventaKpiRecord);
        }
    }
    return records;
};

const parsePostventaBillingCSV = (csvText: string): BillingRecord[] => {
    const rows = parseCSV(csvText);
    if (rows.length < 2) return [];

    const headers = rows[0].map(cleanHeader);
    const records: BillingRecord[] = [];

    for (let i = 1; i < rows.length; i++) {
        const currentLine = rows[i];
        if (currentLine.length < 2) continue;

        const record: any = { id: `billing-row-${i}` };
        
        headers.forEach((header, index) => {
            const value = currentLine[index] || '';

            if (header.includes('nro mes')) record.nro_mes = parseInt(value) || 0;
            else if (header.includes('mes')) record.mes = normalizeMonth(value);
            else if (header.includes('anio') || header.includes('ano')) record.anio = parseInt(value) || 2026;
            else if (header.includes('sucursal') || header.includes('unidad')) record.sucursal = normalizeBranch(value);
            else if (header.includes('area')) record.area = value;
            else if (header.includes('objetivo mensual')) record.objetivo_mensual = parseNumber(value);
            else if (header.includes('avance a fecha') || header.includes('avance fecha')) record.avance_fecha = parseNumber(value);
            else if (header.includes('cumplimiento a la fecha') || header.includes('cumplimiento fecha')) record.cumplimiento_fecha_pct = parseNumber(value);
            else if (header.includes('cumplimiento a cierre mes') || header.includes('cumplimiento cierre')) record.cumplimiento_cierre_pct = parseNumber(value);
            else if (header.includes('objetivo diario')) record.objetivo_diario = parseNumber(value);
            else if (header.includes('prom. diario') || header.includes('promedio diario')) record.promedio_diario = parseNumber(value);
            else if (header.includes('desvio a fecha') || header.includes('desvio fecha')) record.desvio_fecha = parseNumber(value);
            else if (header.includes('dif. dias de operación')) record.dif_dias_operacion = parseInt(value) || 0;
            
            record[header] = value;
        });

        if (record.mes && record.mes !== 'Unknown') {
            records.push(record as BillingRecord);
        }
    }
    return records;
};

const parsePCGCCSV = (csvText: string): PCGCRecord[] => {
    const rows = parseCSV(csvText);
    if (rows.length < 1) return [];

    // Find the header row (the one containing "Requerimiento" or "Modulo")
    let headerIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i].map(cleanHeader);
        if (row.some(h => h.includes('requerimiento') || h.includes('modulo'))) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) {
        // Fallback to first row if not found, but maybe it's just empty
        if (rows.length < 2) return [];
        headerIndex = 0;
    }

    const headers = rows[headerIndex].map(cleanHeader);
    const records: PCGCRecord[] = [];

    for (let i = headerIndex + 1; i < rows.length; i++) {
        const currentLine = rows[i];
        if (currentLine.length < 3) continue; // Minimum columns to be valid

        const record: any = { id: `pcgc-row-${i}` };
        
        headers.forEach((header, index) => {
            const value = currentLine[index] || '';

            if (header.includes('modulo')) record.modulo = value;
            else if (header.includes('seccion')) record.seccion = value;
            else if (header.includes('sub-seccion') || header.includes('subseccion')) record.subseccion = value;
            else if (header.includes('sector')) record.sector = value;
            else if (header.includes('requerimiento')) record.requerimiento = value;
            else if (header.includes('observaciones')) record.observaciones = value;
            else if (header.includes('metodo')) record.metodo = value;
            else if (header.includes('criticidad')) record.criticidad = value;
            
            record[header] = value;
        });

        if (record.requerimiento && record.requerimiento.trim() !== "" && record.requerimiento.toLowerCase() !== 'requerimiento') {
            records.push(record as PCGCRecord);
        }
    }
    return records;
};

const containsAny = (value: string, terms: string[]) => terms.some(term => value.includes(term));

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
    const idxCodigo = getIdx('Código');
    const idxCanal = getIdx('Canal de Ventas');
    const idxChasis = getIdx('Chasis');
    const idxEntregaFinal = getIdx('Entrega a cliente final');
    const idxEntregaReportada = getIdx('Entrega a cliente reportada');
    const idxVendedor = getIdx('Vendedor');
    const idxNroCliente = getIdx('Número de cliente');
    const idxNombre = getIdx('Cliente: Nombre');
    const idxApellido = getIdx('Cliente: Apellido');
    const idxDni = getIdx('Cliente: Número de identificación');
    const idxCalle = getIdx('Cliente: Calle');
    const idxCiudad = getIdx('Cliente: Ciudad');
    const idxCp = getIdx('Cliente: Código postal');
    const idxEstado = getIdx('Cliente: Estado');
    const idxCelular = getIdx('Customer: MobilePhone');
    const idxTelCasa = getIdx('Cliente: Teléfono (Casa)');
    const idxTelOficina = getIdx('Cliente: Teléfono (Oficina)');
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
    const idxGestionado = getIdx('¿GESTIONADO?');
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
        if (row.some(cell => cell?.toLowerCase().includes('nº')) && 
            row.some(cell => cell?.toLowerCase().includes('mes')) &&
            row.some(cell => cell?.toLowerCase().includes('kpi'))) {
            headerIndex = i;
            headers = row.map(h => h.toLowerCase().trim());
            break;
        }
    }

    const getIdx = (name: string) => headers.findIndex(h => h.includes(name.toLowerCase()));
    
    const idxNro = getIdx('nº');
    const idxMes = getIdx('mes');
    const idxFechaAlta = getIdx('fecha alta') !== -1 ? getIdx('fecha alta') : getIdx('alta');
    const idxProvincia = getIdx('provincia') !== -1 ? getIdx('provincia') : getIdx('sucursal');
    const idxCaracter = getIdx('carácter');
    const idxSector = getIdx('sector');
    const idxOrigen = getIdx('origen');
    const idxNorma = getIdx('norma');
    const idxRequisito = getIdx('requisito');
    const idxNombreKpi = getIdx('nombre kpi') !== -1 ? getIdx('nombre kpi') : getIdx('kpi');
    const idxObjCuant = getIdx('objetivo kpi cuantitativo');
    const idxObjCual = getIdx('objetivo kpi cualitativo');
    const idxSitCuant = getIdx('situación actual cuantitativo');
    const idxSitCual = getIdx('situación actual cualitativo');
    const idxEnviarDesvio = getIdx('enviar desvío');
    const idxEstado = getIdx('estado');
    const idxCausaRaiz = getIdx('causa raíz');
    const idxAccionInm = getIdx('acción inmediata');
    const idxAccionCorr = getIdx('acción correctiva');
    const idxResponsable = getIdx('responsable');
    const idxIndEficacia = getIdx('indicador de eficiencia');
    const idxObjInd = getIdx('objetivo indicador');
    const idxFechaIniEst = getIdx('fecha inicio est');
    const idxDurEst = getIdx('duración est');
    const idxIniReal = getIdx('inicio real');
    const idxFinReal = getIdx('finalización real');
    const idxDurReal = getIdx('duración real');
    const idxEstadoFinal = getIdx('estado final');
    const idxVerifEficacia = getIdx('verificación eficacia');
    const idxFechaVerif = getIdx('fecha verificación');

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

const parseInternalPostventaCSV = (csvText: string): InternalPostventaRecord[] => {
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
            else if (header === 'organizacion') record.organizacion = parseScore(value);
            else if (header === 'trabajo del taller') record.trabajo_taller = parseScore(value);
            else if (header === 'lavado') record.lavado = parseScore(value);
            
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
            
            record[header] = value;
        });

        record.mes = pickFirstValidMonth(record.fecha_fin, record.created_at, record.mes);
        if (!record.anio) record.anio = 2026;
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
