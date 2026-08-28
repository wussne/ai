export enum Section {
  Home = "home",
  Create = "create",
  History = "history",
  Help = "help",
  Settings = "settings",
  Management = "management",
}

export interface BusinessProcess {
  id: string;
  name: string;
  department: string;
  departmentId?: string;
  position: string;
  positionId?: string;
  description: string;
  createdAt: string;
  attachments?: ProcessAttachment[];
  result?: ProcessResult;
}

export interface ProcessDraft {
  name: string;
  department: string;
  departmentId: string;
  position: string;
  positionId: string;
  description: string;
}

export interface ProcessResult {
  structure: {
    name: string;
    goal: string;
    participants: string[];
    steps: string[];
    blindSpots: string[];
  };
  regulation: {
    whoDoesWhat: string;
    sequence: string;
    outputResult: string;
    responsibilityPoints: string;
  };
  recommendations: {
    bottlenecks: string[];
    improvements: string[];
    metrics: string[];
  };
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export type AttachmentKind = "image" | "pdf" | "text";

export interface ProcessAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: AttachmentKind;
}

export interface DraftAttachment extends ProcessAttachment {
  file: File;
  previewUrl?: string;
}
