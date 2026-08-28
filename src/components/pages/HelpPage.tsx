import { ChevronRight } from "lucide-react";

interface HelpPageProps {
  onSelectExample: (example: string) => void;
}

const EXAMPLES = [
  "Обработка новой заявки с сайта",
  "Выставление счёта и контроль оплаты",
  "Согласование договора с юристом",
  "Подготовка коммерческого предложения",
] as const;

export function HelpPage({ onSelectExample }: HelpPageProps) {
  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Помощь</h2>
        <div className="space-y-6">
          <section><h3 className="text-lg font-bold text-slate-900 mb-2">Что можно описывать?</h3><p className="text-slate-600">Любой повторяющийся процесс в вашей компании: от найма сотрудника до отгрузки товара. Чем чаще повторяется процесс, тем больше пользы принесет его описание и оптимизация.</p></section>
          <section><h3 className="text-lg font-bold text-slate-900 mb-2">Как лучше писать?</h3><p className="text-slate-600">Пишите простыми словами, как будто рассказываете новому сотруднику. Укажите: кто начинает процесс, какие действия совершаются, какие программы используются и что является финальным результатом.</p></section>
          <section><h3 className="text-lg font-bold text-slate-900 mb-2">Какие результаты выдаёт система?</h3><p className="text-slate-600">Вы получите структурированный список шагов, черновик регламента, список рисков и рекомендации по автоматизации или упрощению процесса.</p></section>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-6">Примеры для описания</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {EXAMPLES.map((example) => (
            <button key={example} onClick={() => onSelectExample(example)} className="p-4 bg-white border border-slate-200 rounded-xl text-left hover:border-slate-900 hover:shadow-sm transition-all group flex items-center justify-between">
              <span className="text-slate-700 font-medium">{example}</span><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
