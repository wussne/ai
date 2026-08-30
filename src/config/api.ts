const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');

const runtimeApiBaseUrl = typeof window === 'undefined'
  ? ''
  : window.__APP_CONFIG__?.apiBaseUrl?.trim() || '';

export const apiBaseUrl = stripTrailingSlashes(
  runtimeApiBaseUrl || import.meta.env.VITE_API_BASE_URL?.trim() || '',
);

export const resolveApiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with /: ${path}`);
  }
  return `${apiBaseUrl}${path}`;
};
