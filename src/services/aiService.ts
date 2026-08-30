import {apiRequest} from '../lib/apiClient';
import type {
  BusinessProcess,
  ChatMessage,
  DraftAttachment,
  ProcessDraft,
  ProcessResult,
} from '../types';

const appendAttachments = (formData: FormData, attachments: Blob[]): void => {
  for (const attachment of attachments) formData.append('attachments', attachment);
};

export async function generateProcessResult(
  organizationSlug: string,
  process: ProcessDraft,
  attachments: DraftAttachment[] = [],
): Promise<ProcessResult> {
  const formData = new FormData();
  formData.append('process', JSON.stringify(process));
  appendAttachments(formData, attachments.map((attachment) => attachment.file));

  const response = await apiRequest<{result: ProcessResult}>('/api/ai/generate-process', {
    organizationSlug,
    method: 'POST',
    body: formData,
  });
  return response.result;
}

export async function sendProcessChatMessage(
  organizationSlug: string,
  process: BusinessProcess,
  messages: ChatMessage[],
  input: string,
  attachments: File[] = [],
): Promise<string> {
  const formData = new FormData();
  formData.append('process', JSON.stringify(process));
  formData.append('messages', JSON.stringify(messages));
  formData.append('input', input);
  appendAttachments(formData, attachments);

  const response = await apiRequest<{text: string}>('/api/ai/chat', {
    organizationSlug,
    method: 'POST',
    body: formData,
  });
  return response.text;
}
