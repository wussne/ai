import { EMPTY_PROCESS_DRAFT } from "../constants/ui";
import type { ProcessAttachment, ProcessDraft } from "../types";
import {
  getOrganizationStorageKey,
  migrateLegacyStorageValue,
} from "../utils/organizationStorage";

const STORAGE_KEY = "business_process_draft";
const STORAGE_VERSION = 2;
const MAX_DRAFT_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface PersistedProcessDraft {
  version: number;
  updatedAt: number;
  fields: ProcessDraft;
  attachments: ProcessAttachment[];
}

const EMPTY_PERSISTED_DRAFT: PersistedProcessDraft = {
  version: STORAGE_VERSION,
  updatedAt: Date.now(),
  fields: { ...EMPTY_PROCESS_DRAFT },
  attachments: [],
};

function isProcessAttachment(value: unknown): value is ProcessAttachment {
  if (!value || typeof value !== "object") return false;
  const attachment = value as Partial<ProcessAttachment>;
  return (
    typeof attachment.id === "string" &&
    typeof attachment.name === "string" &&
    typeof attachment.mimeType === "string" &&
    typeof attachment.size === "number" &&
    (attachment.kind === "image" ||
      attachment.kind === "pdf" ||
      attachment.kind === "text")
  );
}

function normalizeFields(value: unknown): ProcessDraft {
  const fields = value && typeof value === "object" ? value : {};
  const candidate = fields as Partial<ProcessDraft>;
  return {
    name: typeof candidate.name === "string" ? candidate.name : "",
    department:
      typeof candidate.department === "string" ? candidate.department : "",
    departmentId:
      typeof candidate.departmentId === "string" ? candidate.departmentId : "",
    position: typeof candidate.position === "string" ? candidate.position : "",
    positionId:
      typeof candidate.positionId === "string" ? candidate.positionId : "",
    description:
      typeof candidate.description === "string" ? candidate.description : "",
  };
}

export function loadProcessDraft(organizationId: string): PersistedProcessDraft {
  const storageKey = migrateLegacyStorageValue(STORAGE_KEY, organizationId);
  const rawDraft = localStorage.getItem(storageKey);
  if (!rawDraft) return { ...EMPTY_PERSISTED_DRAFT, fields: { ...EMPTY_PROCESS_DRAFT } };

  try {
    const parsed = JSON.parse(rawDraft) as Partial<PersistedProcessDraft>;
    const isExpired =
      typeof parsed.updatedAt !== "number" ||
      Date.now() - parsed.updatedAt > MAX_DRAFT_AGE_MS;

    if ((parsed.version !== 1 && parsed.version !== STORAGE_VERSION) || isExpired) {
      localStorage.removeItem(storageKey);
      return { ...EMPTY_PERSISTED_DRAFT, fields: { ...EMPTY_PROCESS_DRAFT } };
    }

    return {
      version: STORAGE_VERSION,
      updatedAt: parsed.updatedAt,
      fields: normalizeFields(parsed.fields),
      attachments: Array.isArray(parsed.attachments)
        ? parsed.attachments.filter(isProcessAttachment)
        : [],
    };
  } catch (error) {
    console.error("Failed to parse process draft", error);
    localStorage.removeItem(storageKey);
    return { ...EMPTY_PERSISTED_DRAFT, fields: { ...EMPTY_PROCESS_DRAFT } };
  }
}

function updateProcessDraft(
  organizationId: string,
  update: Partial<Pick<PersistedProcessDraft, "fields" | "attachments">>,
) {
  const current = loadProcessDraft(organizationId);
  const next: PersistedProcessDraft = {
    ...current,
    ...update,
    version: STORAGE_VERSION,
    updatedAt: Date.now(),
  };
  localStorage.setItem(
    getOrganizationStorageKey(STORAGE_KEY, organizationId),
    JSON.stringify(next),
  );
}

export function saveProcessDraftFields(organizationId: string, fields: ProcessDraft) {
  updateProcessDraft(organizationId, { fields });
}

export function saveProcessDraftAttachments(
  organizationId: string,
  attachments: ProcessAttachment[],
) {
  updateProcessDraft(organizationId, { attachments });
}
