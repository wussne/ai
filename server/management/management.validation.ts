import {HttpError} from '../http/http-error.js';

export const readRequiredText = (
  body: unknown,
  key: string,
  maxLength = 255,
): string => {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new HttpError(400, `Поле «${key}» заполнено неверно`);
  }
  return value.trim();
};

export const readOptionalText = (
  body: unknown,
  key: string,
  maxLength = 4_000,
): string | null => {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new HttpError(400, `Поле «${key}» заполнено неверно`);
  }
  return value.trim();
};

export const readOptionalId = (body: unknown, key: string): string | null => {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new HttpError(400, `Поле «${key}» заполнено неверно`);
  }
  return value;
};

export const readIdArray = (body: unknown, key: string): string[] => {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !/^\d+$/.test(item))) {
    throw new HttpError(400, `Поле «${key}» заполнено неверно`);
  }
  return [...new Set(value)];
};

export const readBoolean = (body: unknown, key: string, fallback: boolean): boolean => {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new HttpError(400, `Поле «${key}» заполнено неверно`);
  return value;
};

export const validateEmail = (email: string): string => {
  const normalized = email.toLowerCase();
  if (normalized.length > 254 || !/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new HttpError(400, 'Укажите корректный email');
  }
  return normalized;
};

export const validatePassword = (password: string): string => {
  if (password.length < 12 || password.length > 256) {
    throw new HttpError(400, 'Пароль должен содержать от 12 до 256 символов');
  }
  return password;
};

export const validateSlug = (slug: string): string => {
  const normalized = slug.toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)) {
    throw new HttpError(400, 'Slug: латинские буквы, цифры и дефисы, до 63 символов');
  }
  return normalized;
};
