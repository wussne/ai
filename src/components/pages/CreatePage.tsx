import { type RefObject } from "react";
import { FileText } from "lucide-react";
import type {
  BusinessProcess,
  ChatMessage,
  DraftAttachment,
  ProcessDraft,
} from "../../types";
import { ProcessForm } from "../process/ProcessForm";
import { ResultPanel } from "../process/ResultPanel";
import type {ProcessDepartmentOption, ProcessPositionOption} from '../../features/process/processApi';

interface CreatePageProps {
  draft: ProcessDraft;
  attachments: DraftAttachment[];
  attachmentError: string | null;
  viewingProcess: BusinessProcess | null;
  activeResultTab: number;
  isGenerating: boolean;
  isRecording: boolean;
  isAddingAttachments: boolean;
  departments: Array<ProcessDepartmentOption & {label: string}>;
  positions: ProcessPositionOption[];
  areOptionsLoading: boolean;
  optionsError: string;
  onReloadOptions: () => void;
  resultRef: RefObject<HTMLDivElement | null>;
  chat: {
    messages: ChatMessage[];
    input: string;
    isLoading: boolean;
    endRef: RefObject<HTMLDivElement | null>;
    onInputChange: (input: string) => void;
    onSend: () => void;
  };
  onDraftChange: (draft: ProcessDraft) => void;
  onFilesSelected: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
  onGenerate: () => void;
  onReset: () => void;
  onStartVoiceInput: () => void;
  onResultTabChange: (tab: number) => void;
  onExport: () => void;
}

export function CreatePage(props: CreatePageProps) {
  return (
    <div className="max-w-full py-8 px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Формализация процесса</h2>
        <p className="text-slate-500 text-sm">Заполните данные для проведения аудита и генерации документации.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5">
          <ProcessForm
            draft={props.draft}
            attachments={props.attachments}
            attachmentError={props.attachmentError}
            isAddingAttachments={props.isAddingAttachments}
            isGenerating={props.isGenerating}
            isRecording={props.isRecording}
            departments={props.departments}
            positions={props.positions}
            areOptionsLoading={props.areOptionsLoading}
            optionsError={props.optionsError}
            onReloadOptions={props.onReloadOptions}
            onDraftChange={props.onDraftChange}
            onFilesSelected={props.onFilesSelected}
            onRemoveAttachment={props.onRemoveAttachment}
            onStartVoiceInput={props.onStartVoiceInput}
            onGenerate={props.onGenerate}
            onReset={props.onReset}
          />
        </div>
        <div className="lg:col-span-7 lg:sticky lg:top-8">
          {props.viewingProcess ? (
            <ResultPanel process={props.viewingProcess} activeTab={props.activeResultTab} resultRef={props.resultRef} chat={props.chat} onTabChange={props.onResultTabChange} onExport={props.onExport} />
          ) : (
            <div className="h-[680px] border border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-white/50">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4"><FileText className="w-6 h-6 text-slate-300" /></div>
              <p className="text-base font-medium text-slate-600 mb-1">Ожидание данных</p>
              <p className="text-xs max-w-xs">Заполните форму слева для запуска процесса автоматизированного анализа.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
