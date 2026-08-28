import {AlertCircle, LoaderCircle} from 'lucide-react';

export function ManagementLoading() {
  return <div className="flex min-h-56 items-center justify-center gap-3 text-sm font-medium text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />Загружаем данные…</div>;
}

export function ManagementError({message, onRetry}: {message: string; onRetry: () => void}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center text-center">
      <AlertCircle className="mb-3 h-6 w-6 text-red-500" />
      <p className="mb-4 max-w-md text-sm text-slate-600">{message}</p>
      <button className="b2b-button-secondary" onClick={onRetry}>Повторить</button>
    </div>
  );
}

export function EmptyState({title, description}: {title: string; description: string}) {
  return <div className="rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center"><p className="font-semibold text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-400">{description}</p></div>;
}
