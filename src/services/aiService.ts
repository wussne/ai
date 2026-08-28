import { GoogleGenAI } from "@google/genai";
import { PROCESS_SCHEMA, SYSTEM_INSTRUCTION } from "../constants/ai";
import type {
  BusinessProcess,
  ChatMessage,
  DraftAttachment,
  ProcessDraft,
  ProcessResult,
} from "../types";

const TEXT_MODEL = "gemini-3.1-pro-preview";
const createAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Gemini API key is missing. Add GEMINI_API_KEY to .env.local and restart the development server.",
    );
  }

  return new GoogleGenAI({ apiKey });
};

export async function generateProcessResult(
  process: ProcessDraft,
  attachments: DraftAttachment[] = [],
): Promise<ProcessResult | null> {
  const attachmentParts = await createAttachmentParts(
    attachments.map((attachment) => ({
      blob: attachment.file,
      mimeType: attachment.mimeType,
    })),
  );

  const response = await createAiClient().models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `
        Проанализируй следующий бизнес-процесс:
        Название: ${process.name}
        Отдел: ${process.department}
        Должность: ${process.position}
        Описание: ${process.description}
      `,
          },
          ...attachmentParts,
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: PROCESS_SCHEMA as any,
    },
  });

  return response.text ? JSON.parse(response.text) : null;
}

export async function sendProcessChatMessage(
  process: BusinessProcess,
  messages: ChatMessage[],
  input: string,
  attachments: File[] = [],
): Promise<string | undefined> {
  const history = messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }],
  }));
  const context = `
        Контекст процесса:
        Название: ${process.name}
        Описание: ${process.description}
        Текущий результат анализа: ${JSON.stringify(process.result)}
      `;
  const attachmentParts = await createAttachmentParts(
    attachments.map((file) => ({
      blob: file,
      mimeType: file.type || "application/octet-stream",
    })),
  );

  const response = await createAiClient().models.generateContent({
    model: TEXT_MODEL,
    contents: [
      { role: "user", parts: [{ text: context }, ...attachmentParts] },
      ...history,
      { role: "user", parts: [{ text: input }] },
    ],
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });

  return response.text;
}

interface BinaryAttachment {
  blob: Blob;
  mimeType: string;
}

async function createAttachmentParts(attachments: BinaryAttachment[]) {
  return Promise.all(
    attachments.map(async (attachment) => ({
      inlineData: {
        data: await readBlobAsBase64(attachment.blob),
        mimeType: attachment.mimeType,
      },
    })),
  );
}

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
