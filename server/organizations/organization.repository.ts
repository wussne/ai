import {postgresPool} from '../database/postgres.js';
import type {OrganizationMembership} from './organization.types.js';

interface OrganizationMembershipRow {
  membership_id: string;
  organization_id: string;
  name: string;
  slug: string;
  is_owner: boolean;
  department: string | null;
  position: string | null;
}

const toOrganizationMembership = (
  row: OrganizationMembershipRow,
): OrganizationMembership => ({
  membershipId: row.membership_id,
  organizationId: row.organization_id,
  name: row.name,
  slug: row.slug,
  isOwner: row.is_owner,
  department: row.department,
  position: row.position,
});

export const findOrganizationsForUser = async (
  userId: string,
): Promise<OrganizationMembership[]> => {
  const result = await postgresPool.query<OrganizationMembershipRow>(
    `
      SELECT
        om.id AS membership_id,
        o.id AS organization_id,
        o.name,
        o.slug,
        om.is_owner,
        d.name AS department,
        p.name AS position
      FROM organization_memberships om
      JOIN organizations o
        ON o.id = om.organization_id
       AND o.is_active = true
      LEFT JOIN departments d
        ON d.id = om.department_id
       AND d.organization_id = om.organization_id
      LEFT JOIN positions p
        ON p.id = om.position_id
       AND p.organization_id = om.organization_id
      WHERE om.user_id = $1
        AND om.is_active = true
      ORDER BY o.name, o.id
    `,
    [userId],
  );

  return result.rows.map(toOrganizationMembership);
};
