import { FileText, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { DraftAttachment } from "../../types";
import { formatFileSize } from "../../utils/file";

interface AttachmentListProps {
  attachments: DraftAttachment[];
  disabled?: boolean;
  onRemove: (id: string) => void;
}

export function AttachmentList({
  attachments,
  disabled = false,
  onRemove,
}: AttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2" aria-label="Прикреплённые файлы">
      <AnimatePresence initial={false}>
        {attachments.map((attachment) => (
          <motion.div
            key={attachment.id}
            layout
            initial={{ opacity: 0, scale: 0.97, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            className="group relative flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 pr-9"
          >
            {attachment.kind === "image" && attachment.previewUrl ? (
              <img
                src={attachment.previewUrl}
                alt=""
                className="h-11 w-11 flex-none rounded-lg border border-slate-200 bg-white object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                <FileText className="h-5 w-5" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800" title={attachment.name}>
                {attachment.name}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {attachment.kind === "pdf" ? "PDF" : attachment.kind === "image" ? "Изображение" : "Текст"}
                <span className="mx-1.5">·</span>
                {formatFileSize(attachment.size)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onRemove(attachment.id)}
              disabled={disabled}
              aria-label={`Удалить файл ${attachment.name}`}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
