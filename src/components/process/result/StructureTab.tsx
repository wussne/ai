import { AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import type { ProcessResult } from "../../../types";

export function StructureTab({ result }: { result: ProcessResult }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-100"><h3 className="b2b-label mb-2">Цель процесса</h3><p className="text-sm font-medium text-slate-900">{result.structure.goal}</p></div>
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
          <h3 className="b2b-label mb-2">Участники</h3>
          <div className="flex flex-wrap gap-1.5">{result.structure.participants.map((participant, index) => <span key={index} className="px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded text-xs font-medium">{participant}</span>)}</div>
        </div>
      </div>

      <div>
        <h3 className="b2b-label mb-4">Пошаговая структура</h3>
        <div className="space-y-4">{result.structure.steps.map((step, index) => (
          <div key={index} className="flex gap-4 items-start group">
            <div className="flex-shrink-0 w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">{index + 1}</div>
            <div className="flex-1 pb-4 border-b border-slate-100 group-last:border-0"><p className="text-slate-700 text-sm leading-relaxed">{step}</p></div>
          </div>
        ))}</div>
      </div>

      {result.structure.blindSpots.length > 0 && (
        <div className="p-5 bg-amber-50 rounded-xl border border-amber-100">
          <h3 className="b2b-label text-amber-600 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Области для уточнения</h3>
          <ul className="space-y-2">{result.structure.blindSpots.map((spot, index) => <li key={index} className="text-sm text-amber-800 flex items-start gap-2"><span className="mt-1.5 w-1 h-1 bg-amber-400 rounded-full flex-shrink-0" />{spot}</li>)}</ul>
        </div>
      )}
    </motion.div>
  );
}
