import {postgresPool} from '../database/postgres.js';
import {withAuditedTransaction} from '../audit/audit.repository.js';
import type {AuditContext} from '../audit/audit.types.js';

export interface CompanyDetails {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const mapCompany = (row: CompanyRow): CompanyDetails => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  isActive: row.is_active,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const getCompany = async (organizationId: string): Promise<CompanyDetails> => {
  const result = await postgresPool.query<CompanyRow>(
    `SELECT id, name, slug, is_active, created_at, updated_at
     FROM organizations WHERE id = $1`,
    [organizationId],
  );
  return mapCompany(result.rows[0]!);
};

export const updateCompany = async (
  organizationId: string,
  name: string,
  slug: string,
  auditContext: AuditContext,
): Promise<CompanyDetails> => {
  return withAuditedTransaction(auditContext, async (client) => {
    const result = await client.query<CompanyRow>(
      `UPDATE organizations
       SET name = $2, slug = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, slug, is_active, created_at, updated_at`,
      [organizationId, name, slug],
    );
    return mapCompany(result.rows[0]!);
  });
};

export const deactivateCompany = async (organizationId: string, auditContext: AuditContext): Promise<void> =>
  withAuditedTransaction(auditContext, async (client) => {
    await client.query(
      `UPDATE organizations SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [organizationId],
    );
  });
