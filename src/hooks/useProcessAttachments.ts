import { useEffect, useRef, useState } from "react";
import {
  getAttachmentKind,
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "../constants/attachments";
import {
  deleteAttachment,
  deleteAttachments,
  garbageCollectAttachments,
  loadAttachmentFile,
  markAttachmentsCommitted,
  saveAttachment,
} from "../services/attachmentStorage";
import {
  loadProcessDraft,
  saveProcessDraftAttachments,
} from "../services/processDraftStorage";
import type { DraftAttachment, ProcessAttachment } from "../types";

function toProcessAttachment({
  id,
  name,
  mimeType,
  size,
  kind,
}: DraftAttachment): ProcessAttachment {
  return { id, name, mimeType, size, kind };
}

function revokePreview(attachment: DraftAttachment) {
  if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
}

async function hydrateAttachment(
  organizationId: string,
  metadata: ProcessAttachment,
): Promise<DraftAttachment | null> {
  const file = await loadAttachmentFile(organizationId, metadata);
  if (!file) return null;

  return {
    ...metadata,
    file,
    previewUrl:
      metadata.kind === "image" ? URL.createObjectURL(file) : undefined,
  };
}

export function useProcessAttachments(
  organizationId: string,
  committedAttachments: ProcessAttachment[],
) {
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const attachmentsRef = useRef<DraftAttachment[]>([]);
  const initialDraftAttachmentsRef = useRef<ProcessAttachment[] | null>(null);
  const initialCommittedAttachmentsRef = useRef(committedAttachments);

  if (initialDraftAttachmentsRef.current === null) {
    initialDraftAttachmentsRef.current = loadProcessDraft(organizationId).attachments;
  }

  useEffect(() => {
    let cancelled = false;

    const restoreDraftAttachments = async () => {
      const draftMetadata = initialDraftAttachmentsRef.current ?? [];

      try {
        const garbageCollectionReport = await garbageCollectAttachments({
          organizationId,
          draftIds: draftMetadata.map((attachment) => attachment.id),
          committedIds: initialCommittedAttachmentsRef.current.map(
            (attachment) => attachment.id,
          ),
        });
        console.info(
          `Attachment garbage collection completed: ${JSON.stringify(garbageCollectionReport)}`,
        );

        const restored = (
          await Promise.all(
            draftMetadata.map((metadata) => hydrateAttachment(organizationId, metadata)),
          )
        ).filter(
          (attachment): attachment is DraftAttachment => attachment !== null,
        );

        if (cancelled) {
          restored.forEach(revokePreview);
          return;
        }

        attachmentsRef.current = restored;
        setAttachments(restored);
        saveProcessDraftAttachments(
          organizationId,
          restored.map(toProcessAttachment),
        );
      } catch (storageError) {
        console.error("Failed to restore draft attachments", storageError);
        if (!cancelled) {
          setError("Не удалось восстановить файлы черновика.");
        }
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    };

    void restoreDraftAttachments();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      attachmentsRef.current.forEach(revokePreview);
    },
    [],
  );

  const replaceAttachments = (next: DraftAttachment[]) => {
    attachmentsRef.current = next;
    setAttachments(next);
    saveProcessDraftAttachments(organizationId, next.map(toProcessAttachment));
  };

  const addFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0 || isHydrating) return;

    setError(null);

    if (attachmentsRef.current.length + files.length > MAX_ATTACHMENT_COUNT) {
      setError(`Можно прикрепить не более ${MAX_ATTACHMENT_COUNT} файлов.`);
      return;
    }

    const invalidFile = files.find((file) => getAttachmentKind(file) === null);
    if (invalidFile) {
      setError(`Формат файла «${invalidFile.name}» не поддерживается.`);
      return;
    }

    const oversizedFile = files.find(
      (file) => file.size > MAX_ATTACHMENT_SIZE_BYTES,
    );
    if (oversizedFile) {
      setError(`Файл «${oversizedFile.name}» превышает лимит 3 МБ.`);
      return;
    }

    const nextAttachments = files.map((file): DraftAttachment => {
      const kind = getAttachmentKind(file)!;
      return {
        id: crypto.randomUUID(),
        name: file.name,
        mimeType:
          file.type ||
          (kind === "text" ? "text/plain" : "application/octet-stream"),
        size: file.size,
        kind,
        file,
        previewUrl:
          kind === "image" ? URL.createObjectURL(file) : undefined,
      };
    });

    setIsAdding(true);
    try {
      await Promise.all(
        nextAttachments.map((attachment) => saveAttachment(organizationId, attachment)),
      );
      replaceAttachments([...attachmentsRef.current, ...nextAttachments]);
    } catch (storageError) {
      nextAttachments.forEach(revokePreview);
      await Promise.allSettled(
        nextAttachments.map((attachment) =>
          deleteAttachment(organizationId, attachment.id),
        ),
      );
      console.error("Failed to save attachments", storageError);
      setError("Не удалось сохранить файлы. Попробуйте ещё раз.");
    } finally {
      setIsAdding(false);
    }
  };

  const removeAttachment = async (id: string) => {
    const attachment = attachmentsRef.current.find((item) => item.id === id);
    if (!attachment) return;

    replaceAttachments(
      attachmentsRef.current.filter((item) => item.id !== id),
    );
    revokePreview(attachment);

    try {
      await deleteAttachment(organizationId, id);
    } catch (storageError) {
      console.error("Failed to delete attachment", storageError);
    }
  };

  const discardAttachments = async () => {
    const currentAttachments = attachmentsRef.current;
    currentAttachments.forEach(revokePreview);
    replaceAttachments([]);
    setError(null);

    try {
      await deleteAttachments(
        organizationId,
        currentAttachments.map(toProcessAttachment),
      );
    } catch (storageError) {
      console.error("Failed to discard attachments", storageError);
    }
  };

  const commitAttachments = async () => {
    const currentAttachments = attachmentsRef.current;
    const metadata = currentAttachments.map(toProcessAttachment);

    try {
      await markAttachmentsCommitted(organizationId, metadata);
    } catch (storageError) {
      console.error("Failed to mark attachments as committed", storageError);
    }

    currentAttachments.forEach(revokePreview);
    replaceAttachments([]);
    setError(null);
  };

  return {
    attachments,
    processAttachments: attachments.map(toProcessAttachment),
    isAdding: isAdding || isHydrating,
    error,
    addFiles,
    removeAttachment,
    discardAttachments,
    commitAttachments,
  };
}
