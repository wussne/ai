import {Router} from 'express';

import {findOrganizationsForUser} from './organization.repository.js';
import {requireOrganizationContext} from './organization.middleware.js';

export const organizationRouter = Router();

organizationRouter.get('/', async (_request, response, next) => {
  try {
    const organizations = await findOrganizationsForUser(
      response.locals.currentUser.id,
    );
    response.json({organizations});
  } catch (error) {
    next(error);
  }
});

organizationRouter.get(
  '/current',
  requireOrganizationContext,
  (_request, response) => {
    response.json({organization: response.locals.organizationContext});
  },
);
