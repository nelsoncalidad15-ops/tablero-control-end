const INVALID_PREFIX = 'VITE_API_URL=';
const DASHBOARD_PASSWORD_STORAGE_KEY = 'autosol_dashboard_password';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const safeStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const resolveApiBase = (): string => {
  const rawValue = import.meta.env.VITE_API_URL;

  if (!rawValue) {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
    return '';
  }

  const sanitizedValue = rawValue.trim().replace(/^["']|["']$/g, '');
  const value = sanitizedValue.startsWith(INVALID_PREFIX)
    ? sanitizedValue.slice(INVALID_PREFIX.length).trim()
    : sanitizedValue;

  if (!value) {
    return '';
  }

  try {
    return trimTrailingSlash(new URL(value).toString());
  } catch {
    console.error(`[API Config] Invalid VITE_API_URL: ${value}`);
    return '';
  }
};

export const buildApiUrl = (path: string): string => {
  const apiBase = resolveApiBase();
  return apiBase ? `${apiBase}${path}` : path;
};

export const getStoredDashboardPassword = (): string => {
  const storage = safeStorage();
  if (!storage) return '';
  return storage.getItem(DASHBOARD_PASSWORD_STORAGE_KEY)?.trim() || '';
};

export const setStoredDashboardPassword = (password: string): void => {
  const storage = safeStorage();
  if (!storage) return;
  const value = password.trim();
  if (!value) {
    storage.removeItem(DASHBOARD_PASSWORD_STORAGE_KEY);
    return;
  }
  storage.setItem(DASHBOARD_PASSWORD_STORAGE_KEY, value);
};

export const clearStoredDashboardPassword = (): void => {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(DASHBOARD_PASSWORD_STORAGE_KEY);
};
