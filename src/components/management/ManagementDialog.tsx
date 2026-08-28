import {useEffect, type FormEvent, type ReactNode} from 'react';
import {LoaderCircle, X} from 'lucide-react';

interface ManagementDialogProps {
  title: string;
  description?: string;
  submitLabel?: string;
  isSaving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

export function ManagementDialog({
  title, description, submitLabel = 'Сохранить', isSaving, error, onClose, onSubmit, children,
}: ManagementDialogProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isSaving) onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isSaving, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onClose(); }}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="management-dialog-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
        onSubmit={onSubmit}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 id="management-dialog-title" className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900" onClick={onClose} aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 p-6">{children}</div>
        <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          <p role="alert" className="text-xs font-medium text-red-600">{error}</p>
          <div className="ml-auto flex gap-2">
            <button type="button" className="b2b-button-secondary" disabled={isSaving} onClick={onClose}>Отмена</button>
            <button type="submit" className="b2b-button-primary min-w-28" disabled={isSaving}>
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
