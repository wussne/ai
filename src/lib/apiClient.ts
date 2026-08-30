import {resolveApiUrl} from '../config/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface ApiRequestOptions extends RequestInit {
  organizationSlug?: string;
}

export const apiRequest = async <T>(
  path: string,
  {organizationSlug, ...init}: ApiRequestOptions = {},
): Promise<T> => {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (organizationSlug) headers.set('X-Organization-Slug', organizationSlug);

  let response: Response;
  try {
    response = await fetch(resolveApiUrl(path), {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Сервер временно недоступен', 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {message?: string} | null;
    throw new ApiError(body?.message || 'Не удалось выполнить запрос', response.status);
  }

  return response.status === 204 ? (undefined as T) : response.json();
};
