import { Fragment } from "react";
import { motion } from "motion/react";
import type { ProcessResult } from "../../../types";

export function FlowTab({ result }: { result: ProcessResult }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="text-center mb-8"><h3 className="b2b-label">Визуальная схема процесса</h3><p className="text-xs text-slate-400">Автоматическая генерация логических связей</p></div>
      <div className="flex flex-col items-center gap-4">
        {result.structure.steps.map((step, index) => (
          <Fragment key={index}>
            <div className="w-full max-w-sm p-4 bg-white border-2 border-slate-900 rounded-xl shadow-sm relative group"><div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold">{index + 1}</div><p className="text-xs font-medium text-slate-900 text-center">{step}</p></div>
            {index < result.structure.steps.length - 1 && <div className="w-0.5 h-8 bg-slate-200 relative"><div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-200" /></div>}
          </Fragment>
        ))}
      </div>
      <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100"><p className="text-[10px] text-slate-400 text-center italic">Схема построена на основе анализа последовательности шагов. Для более сложных диаграмм используйте экспорт.</p></div>
    </motion.div>
  );
}
