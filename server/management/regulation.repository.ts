import {postgresPool} from '../database/postgres.js';
import {HttpError} from '../http/http-error.js';
import {withAuditedTransaction} from '../audit/audit.repository.js';
import type {AuditContext} from '../audit/audit.types.js';

export type RegulationStatus = 'draft' | 'review' | 'approved' | 'archived';
export type RegulationAccessLevel = 'view' | 'edit' | 'approve' | 'manage';

export interface FunctionLink {
  functionId: string;
  accessLevel: RegulationAccessLevel;
}

export interface RegulationInput {
  title: string;
  description: string | null;
  content: string;
  changeDescription: string | null;
  status: 'draft' | 'review';
  functionLinks: FunctionLink[];
  expectedVersion?: number;
}

export interface RegulationItem {
  id: string;
  title: string;
  description: string | null;
  status: RegulationStatus;
  versionNumber: number;
  content: string;
  changeDescription: string | null;
  functionLinks: FunctionLink[];
  updatedAt: string;
}

interface RegulationRow {
  id: string;
  title: string;
  description: string | null;
  status: RegulationStatus;
  version_number: number | null;
  content: string | null;
  change_description: string | null;
  function_links: FunctionLink[];
  updated_at: Date;
}

const mapRegulation = (row: RegulationRow): RegulationItem => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  versionNumber: row.version_number ?? 0,
  content: row.content ?? '',
  changeDescription: row.change_description,
  functionLinks: row.function_links,
  updatedAt: row.updated_at.toISOString(),
});

export const listRegulations = async (organizationId: string): Promise<RegulationItem[]> => {
  const result = await postgresPool.query<RegulationRow>(
    `SELECT r.id, r.title, r.description, r.status, r.updated_at,
       latest.version_number, latest.content, latest.change_description,
       COALESCE((
         SELECT json_agg(json_build_object(
           'functionId', fr.function_id::text,
           'accessLevel', fr.access_level
         ) ORDER BY fr.function_id)
         FROM function_regulations fr
         WHERE fr.organization_id = r.organization_id AND fr.regulation_id = r.id
       ), '[]'::json) AS function_links
     FROM regulations r
     LEFT JOIN LATERAL (
       SELECT rv.version_number, rv.content, rv.change_description
       FROM regulation_versions rv
       WHERE rv.organization_id = r.organization_id AND rv.regulation_id = r.id
       ORDER BY rv.version_number DESC LIMIT 1
     ) latest ON true
     WHERE r.organization_id = $1
     ORDER BY r.updated_at DESC, r.id DESC`,
    [organizationId],
  );
  return result.rows.map(mapRegulation);
};

const replaceFunctionLinks = async (
  client: import('pg').PoolClient,
  organizationId: string,
  regulationId: string,
  links: FunctionLink[],
): Promise<void> => {
  await client.query(
    `DELETE FROM function_regulations WHERE organization_id = $1 AND regulation_id = $2`,
    [organizationId, regulationId],
  );
  for (const link of links) {
    await client.query(
      `INSERT INTO function_regulations (organization_id, function_id, regulation_id, access_level)
       SELECT $1, id, $2, $3::regulation_access_level
       FROM business_functions WHERE organization_id = $1 AND id = $4`,
      [organizationId, regulationId, link.accessLevel, link.functionId],
    );
  }
};

export const createRegulation = async (
  organizationId: string,
  membershipId: string,
  input: RegulationInput,
  auditContext: AuditContext,
): Promise<void> => {
  await withAuditedTransaction(auditContext, async (client) => {
    const regulation = await client.query<{id: string}>(
      `INSERT INTO regulations
         (organization_id, title, description, status, created_by_membership_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [organizationId, input.title, input.description, input.status, membershipId],
    );
    const id = regulation.rows[0]!.id;
    await client.query(
      `INSERT INTO regulation_versions
         (organization_id, regulation_id, version_number, content, change_description, created_by_membership_id)
       VALUES ($1, $2, 1, $3, $4, $5)`,
      [organizationId, id, input.content, input.changeDescription, membershipId],
    );
    await replaceFunctionLinks(client, organizationId, id, input.functionLinks);
  });
};

export const updateRegulation = async (
  organizationId: string,
  regulationId: string,
  membershipId: string,
  input: RegulationInput,
  auditContext: AuditContext,
): Promise<void> => {
  await withAuditedTransaction(auditContext, async (client) => {
    const current = await client.query<{version_number: number; content: string; status: RegulationStatus}>(
      `SELECT rv.version_number, rv.content, r.status
       FROM regulations r
       JOIN regulation_versions rv ON rv.organization_id = r.organization_id AND rv.regulation_id = r.id
       WHERE r.organization_id = $1 AND r.id = $2
       ORDER BY rv.version_number DESC LIMIT 1 FOR UPDATE OF r`,
      [organizationId, regulationId],
    );
    const row = current.rows[0];
    if (!row) throw new HttpError(404, 'Регламент не найден');
    if (row.status === 'approved' || row.status === 'archived') {
      throw new HttpError(409, 'Утверждённый или архивный регламент нельзя редактировать');
    }
    if (input.expectedVersion !== undefined && input.expectedVersion !== row.version_number) {
      throw new HttpError(409, 'Регламент уже изменил другой пользователь. Обновите страницу.');
    }
    await client.query(
      `UPDATE regulations SET title = $3, description = $4, status = $5, updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, regulationId, input.title, input.description, input.status],
    );
    if (input.content !== row.content) {
      await client.query(
        `INSERT INTO regulation_versions
           (organization_id, regulation_id, version_number, content, change_description, created_by_membership_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [organizationId, regulationId, row.version_number + 1, input.content, input.changeDescription, membershipId],
      );
    }
    await replaceFunctionLinks(client, organizationId, regulationId, input.functionLinks);
  });
};

export const approveRegulation = async (
  organizationId: string,
  regulationId: string,
  membershipId: string,
  auditContext: AuditContext,
): Promise<void> => {
  await withAuditedTransaction(auditContext, async (client) => {
    const result = await client.query(
      `UPDATE regulations SET status = 'approved', updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $1 AND id = $2 AND status = 'review' RETURNING id`,
      [organizationId, regulationId],
    );
    if (!result.rowCount) throw new HttpError(409, 'Утвердить можно только регламент на согласовании');
    await client.query(
      `UPDATE regulation_versions SET approved_by_membership_id = $3, approved_at = CURRENT_TIMESTAMP
       WHERE organization_id = $1 AND regulation_id = $2
         AND version_number = (SELECT max(version_number) FROM regulation_versions WHERE organization_id = $1 AND regulation_id = $2)`,
      [organizationId, regulationId, membershipId],
    );
  });
};

export const archiveRegulation = async (
  organizationId: string,
  regulationId: string,
  auditContext: AuditContext,
): Promise<void> => withAuditedTransaction(auditContext, async (client) => {
  const result = await client.query(
    `UPDATE regulations SET status = 'archived', updated_at = CURRENT_TIMESTAMP
     WHERE organization_id = $1 AND id = $2 AND status <> 'archived'`,
    [organizationId, regulationId],
  );
  if (!result.rowCount) throw new HttpError(409, 'Регламент уже находится в архиве');
});

export const deleteRegulation = async (
  organizationId: string,
  regulationId: string,
  auditContext: AuditContext,
): Promise<void> => withAuditedTransaction(auditContext, async (client) => {
  await client.query(`DELETE FROM regulations WHERE organization_id = $1 AND id = $2`, [organizationId, regulationId]);
});
