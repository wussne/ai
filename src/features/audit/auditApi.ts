import {apiRequest} from '../../lib/apiClient';
import type {AuditLogPage} from './audit.types';

export const getAuditLogs = (
  slug: string,
  before: string | null = null,
): Promise<AuditLogPage> => {
  const query = new URLSearchParams({limit: '50'});
  if (before) query.set('before', before);
  return apiRequest(`/api/audit-logs?${query}`, {organizationSlug: slug});
};
