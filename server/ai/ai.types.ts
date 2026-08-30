export interface AiAttachment {
  buffer: Buffer;
  mimeType: string;
}

export interface ProcessInput {
  name: string;
  department: string;
  position: string;
  description: string;
}

export interface ChatMessageInput {
  role: 'user' | 'model';
  text: string;
}

export interface ChatProcessInput {
  name: string;
  description: string;
  result: unknown;
}
