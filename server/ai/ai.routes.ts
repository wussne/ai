import {Router} from 'express';

import {HttpError} from '../http/http-error.js';
import {aiRateLimiter, limitAiConcurrency} from './ai-limits.middleware.js';
import {generateProcessResult, sendProcessChatMessage} from './ai.service.js';
import {
  aiAttachmentUpload,
  getUploadedAttachments,
  MAX_AI_ATTACHMENT_COUNT,
} from './ai-upload.middleware.js';

const parseField = <T>(value: unknown, name: string): T => {
  if (typeof value !== 'string') throw new HttpError(400, `Missing field: ${name}`);
  try { return JSON.parse(value) as T; } catch { throw new HttpError(400, `Invalid JSON field: ${name}`); }
};
const requiredText = (value: unknown, name: string, maxLength = 20_000): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new HttpError(400, `Invalid field: ${name}`);
  }
  return value.trim();
};
export const aiRouter = Router();
aiRouter.use(aiRateLimiter);
aiRouter.use(limitAiConcurrency);

aiRouter.post('/generate-process', aiAttachmentUpload.array('attachments', MAX_AI_ATTACHMENT_COUNT), async (request, response, next) => {
  try {
    const raw = parseField<Record<string, unknown>>(request.body.process, 'process');
    const result = await generateProcessResult({
      name: requiredText(raw.name, 'name', 255),
      department: requiredText(raw.department, 'department', 255),
      position: requiredText(raw.position, 'position', 255),
      description: requiredText(raw.description, 'description'),
    }, getUploadedAttachments(request));
    response.json({result});
  } catch (error) { next(error); }
});

aiRouter.post('/chat', aiAttachmentUpload.array('attachments', MAX_AI_ATTACHMENT_COUNT), async (request, response, next) => {
  try {
    const process = parseField<Record<string, unknown>>(request.body.process, 'process');
    const rawMessages = parseField<unknown[]>(request.body.messages, 'messages');
    if (!Array.isArray(rawMessages) || rawMessages.length > 100) {
      throw new HttpError(400, 'Invalid field: messages');
    }
    const messages = rawMessages.map((message) => {
      if (!message || typeof message !== 'object') throw new HttpError(400, 'Invalid chat message');
      const candidate = message as Record<string, unknown>;
      if (candidate.role !== 'user' && candidate.role !== 'model') {
        throw new HttpError(400, 'Invalid chat message role');
      }
      const role: 'user' | 'model' = candidate.role;
      return {role, text: requiredText(candidate.text, 'message')};
    });
    const text = await sendProcessChatMessage({
      name: requiredText(process.name, 'name', 255),
      description: requiredText(process.description, 'description'),
      result: process.result,
    }, messages, requiredText(request.body.input, 'input'), getUploadedAttachments(request));
    response.json({text});
  } catch (error) { next(error); }
});
