import {
  DirectionReportDocument,
  FavoriteReportPreset,
} from '../types/directionReport';

const DB_NAME = 'autosol_direction_reports_db';
const DB_VERSION = 1;
const DRAFTS_STORE = 'drafts';
const PRESETS_STORE = 'presets';

const FALLBACK_DRAFTS_KEY = 'autosol_dir_drafts_fallback_v1';
const FALLBACK_PRESETS_KEY = 'autosol_dir_presets_fallback_v1';

function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      reject(new Error('IndexedDB no disponible en este entorno.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        const store = db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(PRESETS_STORE)) {
        db.createObjectStore(PRESETS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB.'));
  });
}

// --- Drafts Operations ---

export async function listDirectionReportDrafts(): Promise<DirectionReportDocument[]> {
  try {
    const db = await openDatabase();
    return await new Promise<DirectionReportDocument[]>((resolve, reject) => {
      const tx = db.transaction(DRAFTS_STORE, 'readonly');
      const store = tx.objectStore(DRAFTS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result || []) as DirectionReportDocument[];
        items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(FALLBACK_DRAFTS_KEY);
        const parsed = raw ? (JSON.parse(raw) as DirectionReportDocument[]) : [];
        return parsed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      } catch {
        return [];
      }
    }
    return [];
  }
}

export async function getDirectionReportDraft(id: string): Promise<DirectionReportDocument | null> {
  try {
    const db = await openDatabase();
    return await new Promise<DirectionReportDocument | null>((resolve, reject) => {
      const tx = db.transaction(DRAFTS_STORE, 'readonly');
      const store = tx.objectStore(DRAFTS_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as DirectionReportDocument) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const all = await listDirectionReportDrafts();
    return all.find(d => d.id === id) || null;
  }
}

export async function saveDirectionReportDraft(
  doc: DirectionReportDocument
): Promise<DirectionReportDocument> {
  const updatedDoc: DirectionReportDocument = {
    ...doc,
    updatedAt: new Date().toISOString(),
  };

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFTS_STORE, 'readwrite');
      const store = tx.objectStore(DRAFTS_STORE);
      const req = store.put(updatedDoc);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return updatedDoc;
  } catch {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = await listDirectionReportDrafts();
      const filtered = current.filter(d => d.id !== updatedDoc.id);
      window.localStorage.setItem(FALLBACK_DRAFTS_KEY, JSON.stringify([updatedDoc, ...filtered]));
    }
    return updatedDoc;
  }
}

export async function deleteDirectionReportDraft(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFTS_STORE, 'readwrite');
      const store = tx.objectStore(DRAFTS_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = await listDirectionReportDrafts();
      window.localStorage.setItem(
        FALLBACK_DRAFTS_KEY,
        JSON.stringify(current.filter(d => d.id !== id))
      );
    }
  }
}

export async function renameDirectionReportDraft(
  id: string,
  newName: string
): Promise<DirectionReportDocument | null> {
  const existing = await getDirectionReportDraft(id);
  if (!existing) return null;
  return saveDirectionReportDraft({
    ...existing,
    name: newName.trim() || existing.name,
  });
}

export function exportDraftToJsonFile(doc: DirectionReportDocument): void {
  const jsonString = JSON.stringify(doc, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = doc.name
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  a.href = url;
  a.download = `${safeName || 'informe_direccion'}_${doc.year}.autosol.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importDraftFromJsonFile(file: File): Promise<DirectionReportDocument> {
  const text = await file.text();
  const parsed = JSON.parse(text) as DirectionReportDocument;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.pages)) {
    throw new Error('El archivo seleccionado no es un borrador válido de Informe Ejecutivo.');
  }
  const importedDoc: DirectionReportDocument = {
    ...parsed,
    id: `dir-rep-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: `${parsed.name || 'Informe Importado'} (Importado)`,
    updatedAt: new Date().toISOString(),
  };
  return saveDirectionReportDraft(importedDoc);
}

// --- Favorite Configuration Presets ---

export async function listFavoritePresets(): Promise<FavoriteReportPreset[]> {
  try {
    const db = await openDatabase();
    return await new Promise<FavoriteReportPreset[]>((resolve, reject) => {
      const tx = db.transaction(PRESETS_STORE, 'readonly');
      const store = tx.objectStore(PRESETS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result || []) as FavoriteReportPreset[];
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(FALLBACK_PRESETS_KEY);
        return raw ? (JSON.parse(raw) as FavoriteReportPreset[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}

export async function saveFavoritePreset(
  preset: Omit<FavoriteReportPreset, 'id' | 'createdAt'>
): Promise<FavoriteReportPreset> {
  const fullPreset: FavoriteReportPreset = {
    ...preset,
    id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PRESETS_STORE, 'readwrite');
      const store = tx.objectStore(PRESETS_STORE);
      const req = store.put(fullPreset);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return fullPreset;
  } catch {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = await listFavoritePresets();
      window.localStorage.setItem(FALLBACK_PRESETS_KEY, JSON.stringify([fullPreset, ...current]));
    }
    return fullPreset;
  }
}

export async function deleteFavoritePreset(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PRESETS_STORE, 'readwrite');
      const store = tx.objectStore(PRESETS_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = await listFavoritePresets();
      window.localStorage.setItem(
        FALLBACK_PRESETS_KEY,
        JSON.stringify(current.filter(p => p.id !== id))
      );
    }
  }
}
