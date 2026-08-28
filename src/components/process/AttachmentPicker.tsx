import { type ChangeEvent, useRef } from "react";
import { Loader2, Mic, Paperclip } from "lucide-react";
import { ATTACHMENT_INPUT_ACCEPT } from "../../constants/attachments";

interface AttachmentPickerProps {
  isAdding: boolean;
  isRecording: boolean;
  disabled?: boolean;
  onFilesSelected: (files: FileList) => void;
  onStartVoiceInput: () => void;
}

export function AttachmentPicker({
  isAdding,
  isRecording,
  disabled = false,
  onFilesSelected,
  onStartVoiceInput,
}: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) onFilesSelected(event.target.files);
    event.target.value = "";
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onStartVoiceInput}
          disabled={disabled || isRecording}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            isRecording
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Mic className={`h-4 w-4 ${isRecording ? "animate-pulse" : ""}`} />
          {isRecording ? "Идёт запись" : "Голосовой ввод"}
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ATTACHMENT_INPUT_ACCEPT}
          className="hidden"
          onChange={handleChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isAdding}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
          {isAdding ? "Добавление..." : "Прикрепить файлы"}
        </button>
      </div>

      <span className="text-[10px] font-medium text-slate-400">
        PNG, JPG, WEBP, PDF, TXT · до 5 файлов по 10 МБ
      </span>
    </div>
  );
}
