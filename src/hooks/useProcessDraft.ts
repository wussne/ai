import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import {
  loadProcessDraft,
  saveProcessDraftFields,
} from "../services/processDraftStorage";
import type { ProcessDraft } from "../types";

export function useProcessDraft(organizationId: string) {
  const initialDraftRef = useRef<ReturnType<typeof loadProcessDraft> | null>(null);
  if (initialDraftRef.current === null) {
    initialDraftRef.current = loadProcessDraft(organizationId);
  }

  const [draft, setDraftState] = useState<ProcessDraft>(
    () => initialDraftRef.current!.fields,
  );

  const setDraft: Dispatch<SetStateAction<ProcessDraft>> = (update) => {
    setDraftState((current) => {
      const next = typeof update === "function" ? update(current) : update;
      saveProcessDraftFields(organizationId, next);
      return next;
    });
  };

  const initialDraft = initialDraftRef.current;
  const hasPersistedDraft =
    initialDraft.attachments.length > 0 ||
    [
      initialDraft.fields.name,
      initialDraft.fields.department,
      initialDraft.fields.departmentId,
      initialDraft.fields.position,
      initialDraft.fields.positionId,
      initialDraft.fields.description,
    ].some((value) => value.trim().length > 0);

  return { draft, setDraft, hasPersistedDraft };
}
