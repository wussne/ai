import {postgresPool} from '../database/postgres.js';
import {withAuditedTransaction} from '../audit/audit.repository.js';
import type {AuditContext} from '../audit/audit.types.js';

export interface PermissionItem {id: string; code: string; name: string; description: string | null}
export interface RoleItem {id: string; name: string; description: string | null; permissionIds: string[]}

export const listPermissions = async (): Promise<PermissionItem[]> => {
  const result = await postgresPool.query<PermissionItem>(
    `SELECT id, code, name, description FROM permissions ORDER BY split_part(code, '.', 1), code`,
  );
  return result.rows;
};

export const listRoles = async (organizationId: string): Promise<RoleItem[]> => {
  const result = await postgresPool.query<{
    id: string; name: string; description: string | null; permission_ids: string[];
  }>(
    `SELECT r.id, r.name, r.description,
       COALESCE(array_agg(rp.permission_id::text ORDER BY rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL), ARRAY[]::text[]) AS permission_ids
     FROM roles r LEFT JOIN role_permissions rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
     WHERE r.organization_id = $1 GROUP BY r.id ORDER BY r.name, r.id`,
    [organizationId],
  );
  return result.rows.map((row) => ({id: row.id, name: row.name, description: row.description, permissionIds: row.permission_ids}));
};

export const saveRole = async (
  organizationId: string,
  id: string | null,
  input: Omit<RoleItem, 'id'>,
  auditContext: AuditContext,
): Promise<void> => {
  await withAuditedTransaction(auditContext, async (client) => {
    let roleId = id;
    if (id) {
      await client.query(
        `UPDATE roles SET name = $3, description = $4 WHERE organization_id = $1 AND id = $2`,
        [organizationId, id, input.name, input.description],
      );
    } else {
      const role = await client.query<{id: string}>(
        `INSERT INTO roles (organization_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
        [organizationId, input.name, input.description],
      );
      roleId = role.rows[0]!.id;
    }
    await client.query(`DELETE FROM role_permissions WHERE organization_id = $1 AND role_id = $2`, [organizationId, roleId]);
    if (input.permissionIds.length) {
      await client.query(
        `INSERT INTO role_permissions (organization_id, role_id, permission_id)
         SELECT $1, $2, id FROM permissions WHERE id = ANY($3::bigint[])`,
        [organizationId, roleId, input.permissionIds],
      );
    }
  });
};

export const deleteRole = async (organizationId: string, id: string, auditContext: AuditContext): Promise<void> =>
  withAuditedTransaction(auditContext, async (client) => {
    await client.query(`DELETE FROM roles WHERE organization_id = $1 AND id = $2`, [organizationId, id]);
  });
