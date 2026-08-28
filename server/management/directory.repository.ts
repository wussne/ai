import {postgresPool} from '../database/postgres.js';
import {withAuditedTransaction} from '../audit/audit.repository.js';
import type {AuditContext} from '../audit/audit.types.js';

export interface DirectoryItem {
  id: string;
  name: string;
  description: string | null;
}

export interface DepartmentItem extends DirectoryItem {
  parentId: string | null;
}

export interface PositionItem extends DirectoryItem {
  responsibilityIds: string[];
}

export interface ResponsibilityItem extends DirectoryItem {
  functionIds: string[];
}

export const listDepartments = async (organizationId: string): Promise<DepartmentItem[]> => {
  const result = await postgresPool.query<{
    id: string; name: string; description: string | null; parent_department_id: string | null;
  }>(
    `SELECT id, name, description, parent_department_id
     FROM departments WHERE organization_id = $1 ORDER BY name, id`,
    [organizationId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    parentId: row.parent_department_id,
  }));
};

export const saveDepartment = async (
  organizationId: string,
  id: string | null,
  input: Omit<DepartmentItem, 'id'>,
  auditContext: AuditContext,
): Promise<void> => {
  if (id && input.parentId === id) throw new Error('DEPARTMENT_SELF_PARENT');
  await withAuditedTransaction(auditContext, async (client) => {
    if (id && input.parentId) {
      const descendants = await client.query<{id: string}>(
        `WITH RECURSIVE tree AS (
           SELECT id FROM departments WHERE organization_id = $1 AND parent_department_id = $2
           UNION ALL
           SELECT d.id FROM departments d JOIN tree t ON d.parent_department_id = t.id
           WHERE d.organization_id = $1
         ) SELECT id FROM tree WHERE id = $3 LIMIT 1`,
        [organizationId, id, input.parentId],
      );
      if (descendants.rowCount) throw new Error('DEPARTMENT_CYCLE');
    }
    if (id) {
      await client.query(
        `UPDATE departments SET name = $3, description = $4, parent_department_id = $5
         WHERE organization_id = $1 AND id = $2`,
        [organizationId, id, input.name, input.description, input.parentId],
      );
      return;
    }
    await client.query(
      `INSERT INTO departments (organization_id, name, description, parent_department_id)
       VALUES ($1, $2, $3, $4)`,
      [organizationId, input.name, input.description, input.parentId],
    );
  });
};

export const deleteDepartment = async (organizationId: string, id: string, auditContext: AuditContext): Promise<void> =>
  withAuditedTransaction(auditContext, async (client) => {
    await client.query(`DELETE FROM departments WHERE organization_id = $1 AND id = $2`, [organizationId, id]);
  });

export const listPositions = async (organizationId: string): Promise<PositionItem[]> => {
  const result = await postgresPool.query<{
    id: string; name: string; description: string | null; responsibility_ids: string[];
  }>(
    `SELECT p.id, p.name, p.description,
       COALESCE(array_agg(pr.responsibility_id::text) FILTER (WHERE pr.responsibility_id IS NOT NULL), ARRAY[]::text[]) AS responsibility_ids
     FROM positions p
     LEFT JOIN position_responsibilities pr ON pr.organization_id = p.organization_id AND pr.position_id = p.id
     WHERE p.organization_id = $1 GROUP BY p.id ORDER BY p.name, p.id`,
    [organizationId],
  );
  return result.rows.map((row) => ({id: row.id, name: row.name, description: row.description, responsibilityIds: row.responsibility_ids}));
};

export const listResponsibilities = async (organizationId: string): Promise<ResponsibilityItem[]> => {
  const result = await postgresPool.query<{
    id: string; name: string; description: string | null; function_ids: string[];
  }>(
    `SELECT r.id, r.name, r.description,
       COALESCE(array_agg(rf.function_id::text) FILTER (WHERE rf.function_id IS NOT NULL), ARRAY[]::text[]) AS function_ids
     FROM responsibilities r
     LEFT JOIN responsibility_functions rf ON rf.organization_id = r.organization_id AND rf.responsibility_id = r.id
     WHERE r.organization_id = $1 GROUP BY r.id ORDER BY r.name, r.id`,
    [organizationId],
  );
  return result.rows.map((row) => ({id: row.id, name: row.name, description: row.description, functionIds: row.function_ids}));
};

export const listFunctions = async (organizationId: string): Promise<DirectoryItem[]> => {
  const result = await postgresPool.query<DirectoryItem>(
    `SELECT id, name, description FROM business_functions WHERE organization_id = $1 ORDER BY name, id`,
    [organizationId],
  );
  return result.rows;
};

type DirectoryTable = 'positions' | 'responsibilities' | 'business_functions';
const TABLES: Record<DirectoryTable, DirectoryTable> = {
  positions: 'positions', responsibilities: 'responsibilities', business_functions: 'business_functions',
};

export const saveDirectoryItem = async (
  table: DirectoryTable,
  organizationId: string,
  id: string | null,
  item: Omit<DirectoryItem, 'id'>,
  relationIds: string[],
  auditContext: AuditContext,
): Promise<void> => {
  await withAuditedTransaction(auditContext, async (client) => {
    const safeTable = TABLES[table];
    let entityId = id;
    if (id) {
      await client.query(
        `UPDATE ${safeTable} SET name = $3, description = $4 WHERE organization_id = $1 AND id = $2`,
        [organizationId, id, item.name, item.description],
      );
    } else {
      const result = await client.query<{id: string}>(
        `INSERT INTO ${safeTable} (organization_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
        [organizationId, item.name, item.description],
      );
      entityId = result.rows[0]!.id;
    }

    if (table === 'positions') {
      await client.query(`DELETE FROM position_responsibilities WHERE organization_id = $1 AND position_id = $2`, [organizationId, entityId]);
      if (relationIds.length) {
        await client.query(
          `INSERT INTO position_responsibilities (organization_id, position_id, responsibility_id)
           SELECT $1, $2, id FROM responsibilities WHERE organization_id = $1 AND id = ANY($3::bigint[])`,
          [organizationId, entityId, relationIds],
        );
      }
    }
    if (table === 'responsibilities') {
      await client.query(`DELETE FROM responsibility_functions WHERE organization_id = $1 AND responsibility_id = $2`, [organizationId, entityId]);
      if (relationIds.length) {
        await client.query(
          `INSERT INTO responsibility_functions (organization_id, responsibility_id, function_id)
           SELECT $1, $2, id FROM business_functions WHERE organization_id = $1 AND id = ANY($3::bigint[])`,
          [organizationId, entityId, relationIds],
        );
      }
    }
  });
};

export const deleteDirectoryItem = async (
  table: DirectoryTable,
  organizationId: string,
  id: string,
  auditContext: AuditContext,
): Promise<void> => {
  await withAuditedTransaction(auditContext, async (client) => {
    await client.query(`DELETE FROM ${TABLES[table]} WHERE organization_id = $1 AND id = $2`, [organizationId, id]);
  });
};
