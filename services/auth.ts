import { buildApiUrl } from './apiConfig';

const TOKEN_KEY = 'autosol_dashboard_session';

export const getDashboardToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(TOKEN_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as { token?: string; expiresAt?: number };
    if (!parsed.token || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return parsed.token;
  } catch {
    window.localStorage.removeItem(TOKEN_KEY);
    return null;
  }
};

export const saveDashboardSession = (token: string, expiresAt: number) => {
  window.localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt }));
};

export const clearDashboardSession = () => {
  window.localStorage.removeItem(TOKEN_KEY);
};

export const verifyDashboardSession = async (token: string | null) => {
  const response = await fetch(buildApiUrl('/api/auth/verify'), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  if (response.status === 401) return { enabled: true, valid: false };
  if (!response.ok) throw new Error('No se pudo verificar el acceso al tablero.');
  return await response.json() as { enabled: boolean; valid: boolean };
};

export const loginToDashboard = async (password: string) => {
  const response = await fetch(buildApiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ password }),
  });
  const result = await response.json() as { token?: string; expiresAt?: number; enabled?: boolean; error?: string };
  if (!response.ok) throw new Error(result.error || 'No se pudo iniciar sesiÃ³n.');
  return result;
};

