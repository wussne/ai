import {Router} from 'express';

import {writeAuditEvent} from '../audit/audit.repository.js';
import {createAuditContext} from '../audit/audit.types.js';
import {listDepartments, listPositions} from '../management/directory.repository.js';
import {HttpError} from '../http/http-error.js';

const PROCESS_EVENTS = new Set(['created', 'deleted', 'draft_reset']);

export const processRouter = Router();

processRouter.get('/options', async (_request, response, next) => {
  try {
    const organizationId = response.locals.organizationContext.organizationId;
    const [departments, positions] = await Promise.all([
      listDepartments(organizationId),
      listPositions(organizationId),
    ]);
    response.json({departments, positions});
  } catch (error) {
    next(error);
  }
});

processRouter.post('/events', async (request, response, next) => {
  try {
    const event = request.body?.event;
    const entityId = request.body?.entityId;
    const name = request.body?.name;
    if (!PROCESS_EVENTS.has(event) || typeof entityId !== 'string' || entityId.length > 100 || typeof name !== 'string' || name.length > 255) {
      throw new HttpError(400, 'Событие аудита заполнено неверно');
    }
    const context = createAuditContext(
      request,
      response.locals.currentUser,
      response.locals.organizationContext,
    );
    await writeAuditEvent(context, 'process_audits', entityId, {
      event,
      name,
      departmentId: typeof request.body?.departmentId === 'string' ? request.body.departmentId : null,
      positionId: typeof request.body?.positionId === 'string' ? request.body.positionId : null,
    });
    response.status(201).json({status: 'recorded'});
  } catch (error) {
    next(error);
  }
});
