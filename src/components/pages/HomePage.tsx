import { AlertCircle, ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { motion } from "motion/react";

interface HomePageProps {
  onStart: () => void;
  onOpenHelp: () => void;
}

const FEATURES = [
  { icon: CheckCircle2, title: "Аудит структуры", description: "Детальная декомпозиция процесса на этапы и определение ролей участников." },
  { icon: AlertCircle, title: "Анализ рисков", description: "Выявление узких мест, слепых зон и точек потери эффективности." },
  { icon: FileText, title: "Проект регламента", description: "Подготовка официального документа для внедрения в работу подразделения." },
] as const;

export function HomePage({ onStart, onOpenHelp }: HomePageProps) {
  return (
    <div className="max-w-5xl mx-auto py-16 px-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Система формализации бизнес-процессов</h1>
        <p className="text-lg text-slate-500 max-w-2xl">Профессиональный инструмент для аудита, описания и оптимизации операционной деятельности компании с применением технологий ИИ.</p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {FEATURES.map(({ icon: Icon, title, description }, index) => (
          <motion.div key={title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="b2b-card p-8">
            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-6"><Icon className="w-6 h-6 text-slate-900" /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button onClick={onStart} className="b2b-button-primary px-8 py-3 text-base">Начать описание процесса<ArrowRight className="w-5 h-5" /></button>
        <button onClick={onOpenHelp} className="b2b-button-secondary px-8 py-3 text-base">Методология</button>
      </div>
    </div>
  );
}
