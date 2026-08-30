import multer from 'multer';

import {HttpError} from '../http/http-error.js';
import type {AiAttachment} from './ai.types.js';

export const MAX_AI_ATTACHMENT_COUNT = 5;
export const MAX_AI_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024;

const ACCEPTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
]);

const TEXT_EXTENSION_MIME_TYPES = new Map([
  ['txt', 'text/plain'],
  ['md', 'text/markdown'],
  ['csv', 'text/csv'],
]);

const getExtension = (filename: string): string =>
  filename.split('.').pop()?.toLowerCase() ?? '';

const resolveMimeType = (file: Express.Multer.File): string | null => {
  if (ACCEPTED_MIME_TYPES.has(file.mimetype)) {
    return file.mimetype;
  }

  if (!file.mimetype || file.mimetype === 'application/octet-stream') {
    return TEXT_EXTENSION_MIME_TYPES.get(getExtension(file.originalname)) ?? null;
  }

  return null;
};

export const aiAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_AI_ATTACHMENT_COUNT,
    fileSize: MAX_AI_ATTACHMENT_SIZE_BYTES,
    fieldSize: 2 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (!resolveMimeType(file)) {
      callback(new HttpError(400, `Неподдерживаемый тип файла: ${file.originalname}`));
      return;
    }
    callback(null, true);
  },
});

export const getUploadedAttachments = (request: Express.Request): AiAttachment[] =>
  (request.files as Express.Multer.File[] | undefined)?.map((file) => ({
    buffer: file.buffer,
    mimeType: resolveMimeType(file) ?? file.mimetype,
  })) ?? [];
