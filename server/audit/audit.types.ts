import type {Request} from 'express';

import type {AuthenticatedUser} from '../auth/auth.types.js';
import type {OrganizationMembership} from '../organizations/organization.types.js';

export interface AuditContext {
  requestId: string;
  organizationId: string;
  membershipId: string;
  userId: string;
  actorName: string;
  actorEmail: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string | null;
  source: 'web';
}

export const createAuditContext = (
  request: Request,
  user: AuthenticatedUser,
  organization: OrganizationMembership,
): AuditContext => ({
  requestId: crypto.randomUUID(),
  organizationId: organization.organizationId,
  membershipId: organization.membershipId,
  userId: user.id,
  actorName: user.fullName,
  actorEmail: user.email,
  method: request.method,
  path: request.originalUrl.split('?')[0] ?? request.originalUrl,
  ip: request.ip,
  userAgent: request.get('user-agent')?.slice(0, 500) ?? null,
  source: 'web',
});
