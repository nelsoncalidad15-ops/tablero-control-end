const INVALID_PREFIX = 'VITE_API_URL=';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

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
