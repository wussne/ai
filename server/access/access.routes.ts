import {Router} from 'express';

export const accessRouter = Router();

accessRouter.get('/', (_request, response) => {
  response.json(response.locals.organizationAccess);
});
