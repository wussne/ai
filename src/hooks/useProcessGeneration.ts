import { useState } from "react";
import { generateProcessResult } from "../services/aiService";
import type {
  BusinessProcess,
  DraftAttachment,
  ProcessAttachment,
  ProcessDraft,
} from "../types";

export function useProcessGeneration(
  organizationSlug: string,
  draft: ProcessDraft,
  attachments: DraftAttachment[],
  processAttachments: ProcessAttachment[],
  onGenerated: (process: BusinessProcess) => void | Promise<void>,
) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = async () => {
    if (!draft.name || !draft.departmentId || !draft.positionId || !draft.description) {
      alert("Заполните название, выберите отдел и должность, затем добавьте описание процесса");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateProcessResult(organizationSlug, draft, attachments);

      await onGenerated({
        id: Date.now().toString(),
        name: draft.name,
        department: draft.department || "Не указан",
        departmentId: draft.departmentId,
        position: draft.position || "Не указана",
        positionId: draft.positionId,
        description: draft.description,
        createdAt: new Date().toLocaleString("ru-RU"),
        attachments: processAttachments,
        result,
      });
    } catch (error) {
      console.error("Generation error:", error);
      alert("Произошла ошибка при генерации. Пожалуйста, попробуйте еще раз.");
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, generate };
}
