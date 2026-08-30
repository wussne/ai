BEGIN;

INSERT INTO organizations (name, slug)
VALUES ('Основная организация', 'main')
ON CONFLICT DO NOTHING;

INSERT INTO permissions (code, name, description)
VALUES
  ('regulation.view', 'Просмотр регламентов', 'Позволяет просматривать доступные регламенты'),
  ('regulation.create', 'Создание регламентов', 'Позволяет создавать новые регламенты'),
  ('regulation.edit', 'Редактирование регламентов', 'Позволяет изменять регламенты'),
  ('regulation.approve', 'Согласование регламентов', 'Позволяет согласовывать и утверждать регламенты'),
  ('regulation.archive', 'Архивирование регламентов', 'Позволяет отправлять регламенты в архив'),
  ('regulation.delete', 'Удаление регламентов', 'Позволяет удалять регламенты'),
  ('employee.view', 'Просмотр сотрудников', 'Позволяет просматривать список сотрудников'),
  ('employee.create', 'Добавление сотрудников', 'Позволяет добавлять новых сотрудников'),
  ('employee.edit', 'Редактирование сотрудников', 'Позволяет изменять данные сотрудников'),
  ('employee.delete', 'Удаление сотрудников', 'Позволяет удалять сотрудников'),
  ('department.manage', 'Управление отделами', 'Позволяет создавать и редактировать отделы'),
  ('position.manage', 'Управление должностями', 'Позволяет создавать и редактировать должности'),
  ('responsibility.manage', 'Управление обязанностями', 'Позволяет создавать и назначать обязанности'),
  ('role.manage', 'Управление ролями', 'Позволяет назначать роли и системные права'),
  ('company.view', 'Просмотр компании', 'Просмотр настроек текущей организации'),
  ('company.edit', 'Редактирование компании', 'Изменение названия и адреса организации'),
  ('company.delete', 'Удаление компании', 'Деактивация организации'),
  ('department.view', 'Просмотр отделов', 'Просмотр структуры подразделений'),
  ('position.view', 'Просмотр должностей', 'Просмотр справочника должностей'),
  ('responsibility.view', 'Просмотр обязанностей', 'Просмотр справочника обязанностей'),
  ('business_function.view', 'Просмотр бизнес-функций', 'Просмотр бизнес-функций организации'),
  ('business_function.manage', 'Управление бизнес-функциями', 'Создание, изменение и удаление бизнес-функций'),
  ('role.view', 'Просмотр ролей', 'Просмотр ролей и назначенных разрешений'),
  ('permission.view', 'Просмотр разрешений', 'Просмотр каталога системных разрешений'),
  ('log.view', 'Просмотр журнала действий', 'Просмотр истории изменений и действий пользователей')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (organization_id, name, description)
SELECT id, 'admin', 'Полный административный доступ'
FROM organizations
WHERE slug = 'main'
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO role_permissions (organization_id, role_id, permission_id)
SELECT role.organization_id, role.id, permission.id
FROM roles role
CROSS JOIN permissions permission
WHERE role.name = 'admin'
ON CONFLICT DO NOTHING;

GRANT USAGE ON SCHEMA public TO business_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO business_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO business_user;

-- Application audit history is append-only.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM business_user;

COMMIT;
