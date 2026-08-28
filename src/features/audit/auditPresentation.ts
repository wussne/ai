import type {AuditLogItem} from './audit.types';

export const ENTITY_LABELS: Record<string, string> = {
  organizations: 'компания',
  users: 'учётная запись',
  organization_memberships: 'сотрудник',
  departments: 'отдел',
  positions: 'должность',
  responsibilities: 'обязанность',
  business_functions: 'бизнес-функция',
  roles: 'роль',
  membership_roles: 'роль сотрудника',
  membership_responsibilities: 'обязанность сотрудника',
  role_permissions: 'разрешение роли',
  position_responsibilities: 'обязанность должности',
  responsibility_functions: 'связь обязанности',
  regulations: 'регламент',
  regulation_versions: 'версия регламента',
  function_regulations: 'доступ к регламенту',
  authentication: 'сессия',
  process_audits: 'аудит процесса',
};

const ACTION_LABELS = {
  insert: 'Создано',
  update: 'Изменено',
  delete: 'Удалено',
  event: 'Действие',
} as const;

const EVENT_LABELS: Record<string, string> = {
  login: 'Вход в систему',
  login_failed: 'Неуспешная попытка входа',
  logout: 'Выход из системы',
  created: 'Создан аудит процесса',
  deleted: 'Удалён аудит процесса',
  draft_reset: 'Сброшен черновик аудита',
};

export const describeAuditLog = (item: AuditLogItem): string => {
  const event = typeof item.changes.event === 'string' ? item.changes.event : null;
  if (event && EVENT_LABELS[event]) return EVENT_LABELS[event];
  return `${ACTION_LABELS[item.action]}: ${ENTITY_LABELS[item.entityType] ?? item.entityType}`;
};

export const displayAuditValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};
