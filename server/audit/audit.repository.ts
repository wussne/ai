import type {PoolClient, QueryResultRow} from 'pg';

import {postgresPool} from '../database/postgres.js';
import type {AuditContext} from './audit.types.js';

export const setAuditContext = async (
  client: PoolClient,
  context: AuditContext,
): Promise<void> => {
  await client.query(`SELECT set_config('app.audit_context', $1, true)`, [JSON.stringify(context)]);
};

export const withAuditedTransaction = async <T>(
  context: AuditContext,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await postgresPool.connect();
  try {
    await client.query('BEGIN');
    await setAuditContext(client, context);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export interface AuditLogItem {
  id: string;
  requestId: string | null;
  actorMembershipId: string | null;
  actorName: string;
  actorEmail: string | null;
  action: 'insert' | 'update' | 'delete' | 'event';
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface AuditLogRow extends QueryResultRow {
  id: string;
  request_id: string | null;
  actor_membership_id: string | null;
  actor_name: string;
  actor_email: string | null;
  action: AuditLogItem['action'];
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export const listAuditLogs = async (
  organizationId: string,
  beforeId: string | null,
  limit: number,
): Promise<{items: AuditLogItem[]; nextCursor: string | null}> => {
  const result = await postgresPool.query<AuditLogRow>(
    `SELECT id, request_id, actor_membership_id, actor_name, actor_email,
       action, entity_type, entity_id, changes, metadata, created_at
     FROM audit_logs
     WHERE organization_id = $1 AND ($2::bigint IS NULL OR id < $2)
     ORDER BY id DESC
     LIMIT $3`,
    [organizationId, beforeId, limit + 1],
  );
  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
  return {
    items: rows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      actorMembershipId: row.actor_membership_id,
      actorName: row.actor_name,
      actorEmail: row.actor_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      changes: row.changes,
      metadata: row.metadata,
      createdAt: row.created_at.toISOString(),
    })),
    nextCursor: hasMore ? rows.at(-1)?.id ?? null : null,
  };
};

export const writeAuditEvent = async (
  context: AuditContext,
  entityType: string,
  entityId: string | null,
  changes: Record<string, unknown>,
): Promise<void> => {
  await postgresPool.query(
    `INSERT INTO audit_logs (
       organization_id, request_id, actor_membership_id, actor_user_id,
       actor_name, actor_email, action, entity_type, entity_id, changes, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, 'event', $7, $8, $9, $10)`,
    [
      context.organizationId, context.requestId, context.membershipId, context.userId,
      context.actorName, context.actorEmail, entityType, entityId, changes,
      {method: context.method, path: context.path, ip: context.ip, userAgent: context.userAgent, source: context.source},
    ],
  );
};
