BEGIN;

INSERT INTO permissions (code, name, description)
VALUES
  ('company.view', 'Просмотр компании', 'Просмотр настроек текущей организации'),
  ('company.edit', 'Редактирование компании', 'Изменение названия и адреса организации'),
  ('company.delete', 'Удаление компании', 'Деактивация организации'),
  ('department.view', 'Просмотр отделов', 'Просмотр структуры подразделений'),
  ('position.view', 'Просмотр должностей', 'Просмотр справочника должностей'),
  ('responsibility.view', 'Просмотр обязанностей', 'Просмотр справочника обязанностей'),
  ('business_function.view', 'Просмотр бизнес-функций', 'Просмотр бизнес-функций организации'),
  ('business_function.manage', 'Управление бизнес-функциями', 'Создание, изменение и удаление бизнес-функций'),
  ('role.view', 'Просмотр ролей', 'Просмотр ролей и назначенных разрешений'),
  ('permission.view', 'Просмотр разрешений', 'Просмотр каталога системных разрешений')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (organization_id, role_id, permission_id)
SELECT r.organization_id, r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON departments, positions, responsibilities, business_functions,
     roles, permissions, role_permissions, position_responsibilities,
     responsibility_functions, membership_roles, membership_responsibilities,
     users
  TO business_user;

GRANT USAGE, SELECT
  ON SEQUENCE users_id_seq, departments_id_seq, positions_id_seq,
     responsibilities_id_seq, business_functions_id_seq, roles_id_seq,
     permissions_id_seq
  TO business_user;

COMMIT;
