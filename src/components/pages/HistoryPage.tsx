import { FileText, History, Trash2 } from "lucide-react";
import type { BusinessProcess } from "../../types";

interface HistoryPageProps {
  processes: BusinessProcess[];
  onCreate: () => void;
  onOpen: (process: BusinessProcess) => void;
  onDelete: (id: string) => void;
}

export function HistoryPage({ processes, onCreate, onOpen, onDelete }: HistoryPageProps) {
  return (
    <div className="max-w-5xl mx-auto py-12 px-8">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Библиотека процессов</h2>
        <p className="text-slate-500 text-sm">Управление формализованными бизнес-процессами организации.</p>
      </div>

      {processes.length === 0 ? (
        <div className="text-center py-24 b2b-card border-dashed bg-transparent">
          <History className="w-10 h-10 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-medium mb-6">Список пуст</p>
          <button onClick={onCreate} className="b2b-button-primary mx-auto">Добавить первый процесс</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {processes.map((process) => (
            <div key={process.id} className="b2b-card p-4 hover:border-slate-400 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors"><FileText className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{process.name}</h3>
                  <div className="flex gap-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                    <span>{process.department}</span><span>•</span><span>{process.position}</span><span>•</span><span>{process.createdAt}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onOpen(process)} className="b2b-button-secondary py-1.5 px-3 text-xs">Открыть</button>
                <button onClick={() => onDelete(process.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
