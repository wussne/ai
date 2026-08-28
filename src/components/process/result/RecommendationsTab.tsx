import { AlertCircle, LayoutDashboard, Zap } from "lucide-react";
import { motion } from "motion/react";
import type { ProcessResult } from "../../../types";

export function RecommendationsTab({ result }: { result: ProcessResult }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <section>
        <h3 className="b2b-label mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /> Выявленные проблемы</h3>
        <div className="grid gap-3">{result.recommendations.bottlenecks.map((item, index) => <div key={index} className="p-4 bg-white border border-slate-200 rounded-xl flex gap-3 items-start"><div className="w-5 h-5 bg-amber-50 text-amber-600 rounded flex items-center justify-center text-[10px] font-bold mt-0.5">!</div><p className="text-sm text-slate-700 leading-relaxed">{item}</p></div>)}</div>
      </section>
      <section>
        <h3 className="b2b-label mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-500" /> Рекомендации по оптимизации</h3>
        <div className="grid gap-3">{result.recommendations.improvements.map((item, index) => <div key={index} className="p-4 bg-white border border-slate-200 rounded-xl flex gap-3 items-start"><div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center text-[10px] font-bold mt-0.5">✓</div><p className="text-sm text-slate-700 leading-relaxed">{item}</p></div>)}</div>
      </section>
      <section>
        <h3 className="b2b-label mb-4 flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-blue-500" /> Ключевые показатели (KPI)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{result.recommendations.metrics.map((item, index) => <div key={index} className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl"><p className="text-xs font-semibold text-blue-800 leading-relaxed">{item}</p></div>)}</div>
      </section>
    </motion.div>
  );
}
