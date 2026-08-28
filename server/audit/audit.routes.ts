import {Router} from 'express';

import {requirePermission} from '../access/access.middleware.js';
import {listAuditLogs} from './audit.repository.js';

export const auditRouter = Router();

auditRouter.get('/', requirePermission('log.view'), async (request, response, next) => {
  try {
    const rawLimit = Number.parseInt(String(request.query.limit ?? '50'), 10);
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
    const before = typeof request.query.before === 'string' && /^\d+$/.test(request.query.before)
      ? request.query.before
      : null;
    const result = await listAuditLogs(
      response.locals.organizationContext.organizationId,
      before,
      limit,
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
});
