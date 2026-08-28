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

export interface AuditLogPage {
  items: AuditLogItem[];
  nextCursor: string | null;
}
