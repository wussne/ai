import { Building2, BriefcaseBusiness, Loader2, RefreshCw, Zap } from "lucide-react";
import type { DraftAttachment, ProcessDraft } from "../../types";
import type { ProcessDepartmentOption, ProcessPositionOption } from "../../features/process/processApi";
import { AttachmentList } from "./AttachmentList";
import { AttachmentPicker } from "./AttachmentPicker";

interface ProcessFormProps {
  draft: ProcessDraft;
  attachments: DraftAttachment[];
  attachmentError: string | null;
  isAddingAttachments: boolean;
  isGenerating: boolean;
  isRecording: boolean;
  departments: Array<ProcessDepartmentOption & {label: string}>;
  positions: ProcessPositionOption[];
  areOptionsLoading: boolean;
  optionsError: string;
  onReloadOptions: () => void;
  onDraftChange: (draft: ProcessDraft) => void;
  onFilesSelected: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
  onStartVoiceInput: () => void;
  onGenerate: () => void;
  onReset: () => void;
}

export function ProcessForm({
  draft,
  attachments,
  attachmentError,
  isAddingAttachments,
  isGenerating,
  isRecording,
  departments,
  positions,
  areOptionsLoading,
  optionsError,
  onReloadOptions,
  onDraftChange,
  onFilesSelected,
  onRemoveAttachment,
  onStartVoiceInput,
  onGenerate,
  onReset,
}: ProcessFormProps) {
  const updateField = (field: keyof ProcessDraft, value: string) => {
    onDraftChange({ ...draft, [field]: value });
  };

  const selectDepartment = (departmentId: string) => {
    const department = departments.find((item) => item.id === departmentId);
    onDraftChange({...draft, departmentId, department: department?.name ?? ''});
  };

  const selectPosition = (positionId: string) => {
    const position = positions.find((item) => item.id === positionId);
    onDraftChange({...draft, positionId, position: position?.name ?? ''});
  };

  return (
    <div className="b2b-card p-6">
      <div className="space-y-5">
        <div>
          <label className="b2b-label">Название процесса</label>
          <input
            type="text"
            placeholder="Напр.: Обработка входящей заявки"
            className="b2b-input"
            value={draft.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="b2b-label">Отдел</label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                className="b2b-input appearance-none pl-9"
                value={draft.departmentId}
                onChange={(event) => selectDepartment(event.target.value)}
                disabled={areOptionsLoading}
                required
              >
                <option value="">{areOptionsLoading ? 'Загружаем отделы…' : 'Выберите отдел'}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="b2b-label">Должность</label>
            <div className="relative">
              <BriefcaseBusiness className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                className="b2b-input appearance-none pl-9"
                value={draft.positionId}
                onChange={(event) => selectPosition(event.target.value)}
                disabled={areOptionsLoading}
                required
              >
                <option value="">{areOptionsLoading ? 'Загружаем должности…' : 'Выберите должность'}</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>{position.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {optionsError ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            <span>{optionsError}</span>
            <button type="button" className="flex shrink-0 items-center gap-1 font-bold" onClick={onReloadOptions}>
              <RefreshCw className="h-3.5 w-3.5" />Повторить
            </button>
          </div>
        ) : null}

        <div>
          <label className="b2b-label">Описание процесса</label>
          <textarea
            rows={12}
            placeholder="Опишите последовательность действий, используемые инструменты и ожидаемый результат..."
            className="b2b-input resize-none"
            value={draft.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </div>

        <AttachmentPicker
          isAdding={isAddingAttachments}
          isRecording={isRecording}
          disabled={isGenerating}
          onFilesSelected={onFilesSelected}
          onStartVoiceInput={onStartVoiceInput}
        />

        <AttachmentList
          attachments={attachments}
          disabled={isGenerating}
          onRemove={onRemoveAttachment}
        />

        {attachmentError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {attachmentError}
          </p>
        )}

        <div className="flex gap-3 pt-3">
          <button
            onClick={onGenerate}
            disabled={isGenerating || isAddingAttachments || areOptionsLoading || Boolean(optionsError)}
            className="b2b-button-primary flex-1 py-3"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Анализ данных...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Сгенерировать результат
              </>
            )}
          </button>
          <button
            onClick={onReset}
            disabled={isGenerating}
            className="b2b-button-secondary px-6 disabled:opacity-50"
          >
            Сбросить
          </button>
        </div>
      </div>
    </div>
  );
}
