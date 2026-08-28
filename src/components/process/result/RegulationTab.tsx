import { Download, Maximize2 } from "lucide-react";
import { motion } from "motion/react";
import type { ProcessResult } from "../../../types";

interface RegulationTabProps {
  result: ProcessResult;
  onExport: () => void;
  onOpenFlow: () => void;
}

export function RegulationTab({ result, onExport, onOpenFlow }: RegulationTabProps) {
  const sections = [
    ["1. Распределение ролей и обязанностей", result.regulation.whoDoesWhat],
    ["2. Порядок выполнения работ", result.regulation.sequence],
    ["3. Требования к результату", result.regulation.outputResult],
    ["4. Контрольные точки и ответственность", result.regulation.responsibilityPoints],
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-8 border border-slate-100 rounded-xl shadow-sm">
      <div className="prose prose-slate max-w-none">
        <div className="text-center mb-10 pb-6 border-b border-slate-100"><h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest">Проект регламента</h2><p className="text-xs text-slate-400 mt-2">Документ сформирован системой Бизнес-ИИ</p></div>
        <div className="space-y-8">{sections.map(([title, content]) => <section key={title}><h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-l-2 border-slate-900 pl-3">{title}</h3><p className="text-slate-700 whitespace-pre-line leading-relaxed">{content}</p></section>)}</div>
      </div>
      <div className="mt-12 flex justify-end gap-3">
        <button onClick={onExport} className="b2b-button-secondary text-xs flex items-center gap-2"><Download className="w-3 h-3" />Экспорт в PDF</button>
        <button onClick={onOpenFlow} className="b2b-button-secondary text-xs flex items-center gap-2"><Maximize2 className="w-3 h-3" />Схема процесса</button>
      </div>
    </motion.div>
  );
}
