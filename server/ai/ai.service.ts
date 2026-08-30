import {GoogleGenAI} from '@google/genai';

import {environment} from '../config/environment.js';
import {PROCESS_SCHEMA, SYSTEM_INSTRUCTION, TEXT_MODEL} from './ai.constants.js';
import type {
  AiAttachment,
  ChatMessageInput,
  ChatProcessInput,
  ProcessInput,
} from './ai.types.js';

const ai = new GoogleGenAI({apiKey: environment.ai.geminiApiKey});
const attachmentParts = (attachments: AiAttachment[]) => attachments.map((attachment) => ({
  inlineData: {data: attachment.buffer.toString('base64'), mimeType: attachment.mimeType},
}));

export const generateProcessResult = async (
  process: ProcessInput,
  attachments: AiAttachment[],
): Promise<unknown> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{role: 'user', parts: [{text: `Проанализируй следующий бизнес-процесс:
Название: ${process.name}
Отдел: ${process.department}
Должность: ${process.position}
Описание: ${process.description}`}, ...attachmentParts(attachments)]}],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: PROCESS_SCHEMA,
    },
  });
  if (!response.text) throw new Error('AI returned an empty process result');
  return JSON.parse(response.text) as unknown;
};

export const sendProcessChatMessage = async (
  process: ChatProcessInput,
  messages: ChatMessageInput[],
  input: string,
  attachments: AiAttachment[],
): Promise<string> => {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {role: 'user', parts: [{text: `Контекст процесса:
Название: ${process.name}
Описание: ${process.description}
Текущий результат анализа: ${JSON.stringify(process.result)}`}, ...attachmentParts(attachments)]},
      ...messages.map((message) => ({role: message.role, parts: [{text: message.text}]})),
      {role: 'user', parts: [{text: input}]},
    ],
    config: {systemInstruction: SYSTEM_INSTRUCTION},
  });
  if (!response.text) throw new Error('AI returned an empty chat response');
  return response.text;
};
