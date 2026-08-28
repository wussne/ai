import {postgresPool} from '../database/postgres.js';
import type {OrganizationAccess, PermissionCode} from './access.types.js';

export const getOrganizationAccess = async (
  organizationId: string,
  membershipId: string,
): Promise<OrganizationAccess> => {
  const result = await postgresPool.query<{is_owner: boolean; permissions: string[]}>(
    `
      SELECT
        om.is_owner,
        COALESCE(
          array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL),
          ARRAY[]::varchar[]
        ) AS permissions
      FROM organization_memberships om
      LEFT JOIN membership_roles mr
        ON mr.organization_id = om.organization_id
       AND mr.membership_id = om.id
      LEFT JOIN role_permissions rp
        ON rp.organization_id = mr.organization_id
       AND rp.role_id = mr.role_id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE om.organization_id = $1
        AND om.id = $2
        AND om.is_active = true
      GROUP BY om.id, om.is_owner
    `,
    [organizationId, membershipId],
  );

  const row = result.rows[0];
  return {
    isOwner: row?.is_owner ?? false,
    permissions: (row?.permissions ?? []) as PermissionCode[],
  };
};

export const canGrantPermissionIds = async (
  access: OrganizationAccess,
  permissionIds: string[],
): Promise<boolean> => {
  if (access.isOwner || !permissionIds.length) return true;
  const result = await postgresPool.query<{code: PermissionCode}>(
    `SELECT code FROM permissions WHERE id = ANY($1::bigint[])`,
    [permissionIds],
  );
  const own = new Set(access.permissions);
  return result.rowCount === permissionIds.length && result.rows.every((row) => own.has(row.code));
};

export const canAssignRoleIds = async (
  organizationId: string,
  access: OrganizationAccess,
  roleIds: string[],
): Promise<boolean> => {
  if (access.isOwner || !roleIds.length) return true;
  const result = await postgresPool.query<{role_id: string; code: PermissionCode | null}>(
    `SELECT r.id AS role_id, p.code
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.organization_id = r.organization_id AND rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     WHERE r.organization_id = $1 AND r.id = ANY($2::bigint[])`,
    [organizationId, roleIds],
  );
  const foundRoles = new Set(result.rows.map((row) => row.role_id));
  const own = new Set(access.permissions);
  return foundRoles.size === roleIds.length && result.rows.every((row) => row.code === null || own.has(row.code));
};
