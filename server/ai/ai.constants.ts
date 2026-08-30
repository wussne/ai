import {Type} from '@google/genai';

export const TEXT_MODEL = 'gemini-3.1-pro-preview';

export const SYSTEM_INSTRUCTION = `Вы — ведущий бизнес-консультант и эксперт по операционной эффективности. Ваша задача — помочь предпринимателю формализовать бизнес-процесс, выявить критические точки и подготовить профессиональный проект регламента.

Придерживайтесь следующих правил:
1. Используйте деловой, официальный стиль изложения.
2. Избегайте лишнего технического жаргона, пишите понятно для собственника бизнеса.
3. Не додумывайте факты. Если информации недостаточно, четко обозначайте это как "Слепую зону" или "Область для уточнения".
4. Структурируйте ответ максимально логично.
5. Регламент должен выглядеть как официальный документ.
6. Рекомендации должны быть практическими и измеримыми.`;

export const PROCESS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    structure: {
      type: Type.OBJECT,
      properties: {
        name: {type: Type.STRING}, goal: {type: Type.STRING},
        participants: {type: Type.ARRAY, items: {type: Type.STRING}},
        steps: {type: Type.ARRAY, items: {type: Type.STRING}},
        blindSpots: {type: Type.ARRAY, items: {type: Type.STRING}},
      },
      required: ['name', 'goal', 'participants', 'steps', 'blindSpots'],
    },
    regulation: {
      type: Type.OBJECT,
      properties: {
        whoDoesWhat: {type: Type.STRING}, sequence: {type: Type.STRING},
        outputResult: {type: Type.STRING}, responsibilityPoints: {type: Type.STRING},
      },
      required: ['whoDoesWhat', 'sequence', 'outputResult', 'responsibilityPoints'],
    },
    recommendations: {
      type: Type.OBJECT,
      properties: {
        bottlenecks: {type: Type.ARRAY, items: {type: Type.STRING}},
        improvements: {type: Type.ARRAY, items: {type: Type.STRING}},
        metrics: {type: Type.ARRAY, items: {type: Type.STRING}},
      },
      required: ['bottlenecks', 'improvements', 'metrics'],
    },
  },
  required: ['structure', 'regulation', 'recommendations'],
};
