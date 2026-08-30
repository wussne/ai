import type { AttachmentKind } from "../types";

export const ATTACHMENT_INPUT_ACCEPT =
  "image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown,text/csv,.md,.txt,.csv";

export const MAX_ATTACHMENT_COUNT = 5;
export const MAX_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export function getAttachmentKind(file: File): AttachmentKind | null {
  if (SUPPORTED_IMAGE_TYPES.has(file.type)) return "image";
  if (file.type === "application/pdf") return "pdf";

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (
    file.type.startsWith("text/") ||
    extension === "txt" ||
    extension === "md" ||
    extension === "csv"
  ) {
    return "text";
  }

  return null;
}
