import { AutoRecord, QualityRecord } from '../types';

// --- Helper Functions ---

const cleanHeader = (h: string) => h.toLowerCase().trim().replace(/[\uFEFF\r\n"]/g, '');

const normalizeBranch = (val: string) => {
    if (!val || val.trim() === '') return 'General';
    let s = val.trim();
    if (s.length > 2) {
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    }
    return s;
};

const normalizeMonth = (val: string) => {
    if (!val) return 'Unknown';
    const s = val.trim().toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
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
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

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

export const fetchSheetData = async (csvUrl: string): Promise<AutoRecord[]> => {
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`Failed to fetch data: ${response.statusText}`);
    const text = await response.text();
    return parseAutoCSV(text);
  } catch (error) {
    console.error("Error loading sheet data", error);
    throw error;
  }
};

export const fetchQualityData = async (csvUrl: string): Promise<QualityRecord[]> => {
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error(`Failed to fetch data: ${response.statusText}`);
      const text = await response.text();
      return parseQualityCSV(text);
    } catch (error) {
      console.error("Error loading quality data", error);
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

      if (header.includes('mes') || header === 'month') {
        record.mes = value;
      } else if (header.includes('anio') || header.includes('año')) {
        record.anio = parseInt(value) || 2025;
      } else if (header.includes('sucursal') || header.includes('taller') || header === 'suc') {
        record.sucursal = value;
      } else if (header.includes('ppt') && header.includes('diario')) {
        record.ppt_diarios = parseNumber(value);
      } else if (header.includes('avance')) {
        record.avance_ppt = parseNumber(value);
      } else if (header.includes('servis')) {
        record.servicios_diarios = parseNumber(value);
      } else if (header.includes('obj') || header.includes('meta')) {
        record.objetivo_mensual = parseNumber(value);
      } else if (header.includes('dias') && header.includes('lab')) {
        record.dias_laborables = parseNumber(value);
      }
      record[header] = value;
    });

    if (!record.mes) record.mes = 'Unknown';
    else record.mes = normalizeMonth(record.mes);

    if (!record.anio) record.anio = 2025;
    record.sucursal = normalizeBranch(record.sucursal);

    records.push(record as AutoRecord);
  }
  return records;
};

const parseQualityCSV = (csvText: string): QualityRecord[] => {
    const rows = parseCSV(csvText);
    if (rows.length < 2) return [];
  
    const headers = rows[0].map(cleanHeader);
    const records: QualityRecord[] = [];
  
    for (let i = 1; i < rows.length; i++) {
      const currentLine = rows[i];
      if (currentLine.length < headers.length - 1) continue;
  
      const record: any = { id: `q-row-${i}` };
      
      headers.forEach((header, index) => {
        const value = currentLine[index] || '';
  
        // Strict mapping based on user feedback
        if (header.includes('sucursal')) record.sucursal = value;
        else if (header.includes('mes')) record.mes = value;
        else if (header === 'cliente') record.cliente = value;
        else if (header.includes('sector')) record.sector = value;
        else if (header.includes('motivos')) record.motivo = value;
        else if (header.includes('responsable de')) record.responsable = value;
        // Prioritize "reclamo / observacion" (Col G) over other similar columns
        else if (header.includes('observación') || header.includes('observacion')) {
            // Avoid capturing resolution observation here if the header is distinct
            if (!header.includes('resolucion')) {
                record.observacion = value;
            }
        }
        else if (header.includes('estado')) record.estado = value;
        // Orden / Nro
        else if (header === 'orden' || header === 'nro' || header === 'or') record.orden = value;

        // NEW FIELDS
        else if (header.includes('resuelto')) record.resuelto = value; // "Reclamo Resuelto?"
        else if (header.includes('resolucion') || header.includes('resolución')) record.observacion_resolucion = value; // "Observacion de resolucion"
        
        // Additional Fields for reference
        record[header] = value;
      });
  
      // Fallback if observacion wasn't caught by the strict check (e.g. header name variation)
      if (!record.observacion && record['reclamo / observación']) record.observacion = record['reclamo / observación'];

      // Defaults
      if (!record.sucursal) record.sucursal = 'General';
      else record.sucursal = normalizeBranch(record.sucursal);

      if (!record.mes) record.mes = 'Unknown';
      else record.mes = normalizeMonth(record.mes); 

      if (!record.anio) record.anio = 2025; 
      if (!record.sector) record.sector = 'Sin Sector';
      if (!record.motivo) record.motivo = 'Sin Motivo';
      
      // Clean orden for unique counting
      if (record.orden) record.orden = record.orden.toString().trim();

      records.push(record as QualityRecord);
    }
    return records;
  };