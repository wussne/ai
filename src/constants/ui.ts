export const RESULT_TABS = [
  "Структура",
  "Регламент",
  "Схема",
  "Рекомендации",
  "Чат с ИИ",
] as const;

export const CHAT_HINTS = [
  {
    label: "Уточнить шаги",
    prompt: "Уточни шаги процесса, добавь больше деталей в каждый этап.",
  },
  {
    label: "Переписать как регламент",
    prompt: "Перепиши описание процесса в формате официального регламента.",
  },
  {
    label: "Найти узкие места",
    prompt: "Проанализируй процесс еще раз и найди скрытые узкие места.",
  },
  {
    label: "Предложить метрики",
    prompt: "Предложи 5 ключевых метрик для контроля этого процесса руководителем.",
  },
] as const;

export const EMPTY_PROCESS_DRAFT = {
  name: "",
  department: "",
  departmentId: "",
  position: "",
  positionId: "",
  description: "",
};
