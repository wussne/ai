import type {PoolClient} from 'pg';

import {hashPassword} from '../auth/password.service.js';
import {postgresPool} from '../database/postgres.js';
import {HttpError} from '../http/http-error.js';
import {withAuditedTransaction} from '../audit/audit.repository.js';
import type {AuditContext} from '../audit/audit.types.js';

export interface EmployeeInput {
  fullName: string;
  email: string;
  password?: string;
  departmentId: string | null;
  positionId: string | null;
  roleIds: string[];
  responsibilityIds: string[];
  isActive: boolean;
  isOwner: boolean;
}

export interface EmployeeItem {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  departmentId: string | null;
  positionId: string | null;
  roleIds: string[];
  responsibilityIds: string[];
  isActive: boolean;
  isOwner: boolean;
}

interface EmployeeRow {
  membership_id: string;
  user_id: string;
  full_name: string;
  email: string;
  department_id: string | null;
  position_id: string | null;
  role_ids: string[];
  responsibility_ids: string[];
  is_active: boolean;
  is_owner: boolean;
}

const mapEmployee = (row: EmployeeRow): EmployeeItem => ({
  membershipId: row.membership_id,
  userId: row.user_id,
  fullName: row.full_name,
  email: row.email,
  departmentId: row.department_id,
  positionId: row.position_id,
  roleIds: row.role_ids,
  responsibilityIds: row.responsibility_ids,
  isActive: row.is_active,
  isOwner: row.is_owner,
});

export const listEmployees = async (organizationId: string): Promise<EmployeeItem[]> => {
  const result = await postgresPool.query<EmployeeRow>(
    `SELECT
       om.id AS membership_id, u.id AS user_id, u.full_name, u.email,
       om.department_id, om.position_id, om.is_active, om.is_owner,
       COALESCE((SELECT array_agg(mr.role_id::text ORDER BY mr.role_id) FROM membership_roles mr
         WHERE mr.organization_id = om.organization_id AND mr.membership_id = om.id), ARRAY[]::text[]) AS role_ids,
       COALESCE((SELECT array_agg(mres.responsibility_id::text ORDER BY mres.responsibility_id) FROM membership_responsibilities mres
         WHERE mres.organization_id = om.organization_id AND mres.membership_id = om.id), ARRAY[]::text[]) AS responsibility_ids
     FROM organization_memberships om
     JOIN users u ON u.id = om.user_id
     WHERE om.organization_id = $1
     ORDER BY om.is_active DESC, om.is_owner DESC, u.full_name, om.id`,
    [organizationId],
  );
  return result.rows.map(mapEmployee);
};

const replaceEmployeeRelations = async (
  client: PoolClient,
  organizationId: string,
  membershipId: string,
  roleIds: string[],
  responsibilityIds: string[],
): Promise<void> => {
  await Promise.all([
    client.query(`DELETE FROM membership_roles WHERE organization_id = $1 AND membership_id = $2`, [organizationId, membershipId]),
    client.query(`DELETE FROM membership_responsibilities WHERE organization_id = $1 AND membership_id = $2`, [organizationId, membershipId]),
  ]);
  if (roleIds.length) {
    await client.query(
      `INSERT INTO membership_roles (organization_id, membership_id, role_id)
       SELECT $1, $2, id FROM roles WHERE organization_id = $1 AND id = ANY($3::bigint[])`,
      [organizationId, membershipId, roleIds],
    );
  }
  if (responsibilityIds.length) {
    await client.query(
      `INSERT INTO membership_responsibilities (organization_id, membership_id, responsibility_id)
       SELECT $1, $2, id FROM responsibilities WHERE organization_id = $1 AND id = ANY($3::bigint[])`,
      [organizationId, membershipId, responsibilityIds],
    );
  }
};

export const createEmployee = async (
  organizationId: string,
  input: EmployeeInput & {password: string},
  actorIsOwner: boolean,
  auditContext: AuditContext,
): Promise<void> => {
  if (input.isOwner && !actorIsOwner) throw new HttpError(403, 'Только владелец может назначить другого владельца');
  const passwordHash = await hashPassword(input.password);
  await withAuditedTransaction(auditContext, async (client) => {
    const existing = await client.query(`SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`, [input.email]);
    if (existing.rowCount) {
      throw new HttpError(409, 'Учётная запись с таким email уже существует. Приглашения существующих пользователей будут добавлены отдельно.');
    }
    const user = await client.query<{id: string}>(
      `INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      [input.fullName, input.email, passwordHash],
    );
    const membership = await client.query<{id: string}>(
      `INSERT INTO organization_memberships
         (organization_id, user_id, department_id, position_id, is_owner, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [organizationId, user.rows[0]!.id, input.departmentId, input.positionId, input.isOwner, input.isActive],
    );
    await replaceEmployeeRelations(client, organizationId, membership.rows[0]!.id, input.roleIds, input.responsibilityIds);
  });
};

export const updateEmployee = async (
  organizationId: string,
  membershipId: string,
  actorMembershipId: string,
  actorIsOwner: boolean,
  canManageRoles: boolean,
  input: EmployeeInput,
  auditContext: AuditContext,
): Promise<void> => {
  await withAuditedTransaction(auditContext, async (client) => {
    const current = await client.query<{
      user_id: string; full_name: string; email: string; is_owner: boolean;
    }>(
      `SELECT om.user_id, om.is_owner, u.full_name, u.email
       FROM organization_memberships om JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.id = $2 FOR UPDATE`,
      [organizationId, membershipId],
    );
    const employee = current.rows[0];
    if (!employee) throw new HttpError(404, 'Сотрудник не найден');
    if ((employee.is_owner || input.isOwner !== employee.is_owner) && !actorIsOwner) {
      throw new HttpError(403, 'Только владелец может изменять владельцев организации');
    }
    if (!canManageRoles) {
      const existingRoles = await client.query<{role_id: string}>(
        `SELECT role_id FROM membership_roles WHERE organization_id = $1 AND membership_id = $2 ORDER BY role_id`,
        [organizationId, membershipId],
      );
      const currentRoleIds = existingRoles.rows.map((row) => row.role_id).sort();
      const requestedRoleIds = [...input.roleIds].sort();
      if (currentRoleIds.join(',') !== requestedRoleIds.join(',')) {
        throw new HttpError(403, 'Для назначения ролей требуется разрешение role.manage');
      }
    }
    if (membershipId === actorMembershipId && !input.isActive) {
      throw new HttpError(409, 'Нельзя отключить собственный доступ');
    }
    if (employee.is_owner && (!input.isOwner || !input.isActive)) {
      const owners = await client.query(
        `SELECT id FROM organization_memberships
         WHERE organization_id = $1 AND is_owner = true AND is_active = true AND id <> $2 LIMIT 1`,
        [organizationId, membershipId],
      );
      if (!owners.rowCount) throw new HttpError(409, 'В организации должен остаться хотя бы один активный владелец');
    }

    if (employee.full_name !== input.fullName || employee.email.toLowerCase() !== input.email.toLowerCase() || input.password) {
      const memberships = await client.query<{count: string}>(
        `SELECT count(*)::text AS count FROM organization_memberships WHERE user_id = $1`,
        [employee.user_id],
      );
      if (Number(memberships.rows[0]!.count) > 1) {
        throw new HttpError(409, 'Профиль состоит в нескольких организациях. Его имя, email и пароль должен менять сам пользователь.');
      }
      const passwordHash = input.password ? await hashPassword(input.password) : null;
      await client.query(
        `UPDATE users SET full_name = $2, email = $3,
           password_hash = COALESCE($4, password_hash), updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [employee.user_id, input.fullName, input.email, passwordHash],
      );
    }
    await client.query(
      `UPDATE organization_memberships
       SET department_id = $3, position_id = $4, is_owner = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, membershipId, input.departmentId, input.positionId, input.isOwner, input.isActive],
    );
    await replaceEmployeeRelations(client, organizationId, membershipId, input.roleIds, input.responsibilityIds);
  });
};

export const removeEmployee = async (
  organizationId: string,
  membershipId: string,
  actorMembershipId: string,
  actorIsOwner: boolean,
  auditContext: AuditContext,
): Promise<void> => {
  if (membershipId === actorMembershipId) throw new HttpError(409, 'Нельзя удалить собственный доступ');
  await withAuditedTransaction(auditContext, async (client) => {
    const result = await client.query<{is_owner: boolean}>(
      `SELECT is_owner FROM organization_memberships WHERE organization_id = $1 AND id = $2 FOR UPDATE`,
      [organizationId, membershipId],
    );
    const employee = result.rows[0];
    if (!employee) throw new HttpError(404, 'Сотрудник не найден');
    if (employee.is_owner && !actorIsOwner) throw new HttpError(403, 'Только владелец может удалить другого владельца');
    await Promise.all([
      client.query(
        `UPDATE organization_memberships
         SET is_active = false, department_id = NULL, position_id = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE organization_id = $1 AND id = $2`,
        [organizationId, membershipId],
      ),
      client.query(`DELETE FROM membership_roles WHERE organization_id = $1 AND membership_id = $2`, [organizationId, membershipId]),
      client.query(`DELETE FROM membership_responsibilities WHERE organization_id = $1 AND membership_id = $2`, [organizationId, membershipId]),
    ]);
  });
};
