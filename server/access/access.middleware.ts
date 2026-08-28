import type {RequestHandler} from 'express';

import {getOrganizationAccess} from './access.repository.js';
import type {PermissionCode} from './access.types.js';

export const loadOrganizationAccess: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    const context = response.locals.organizationContext;
    response.locals.organizationAccess = await getOrganizationAccess(
      context.organizationId,
      context.membershipId,
    );
    next();
  } catch (error) {
    next(error);
  }
};

export const requirePermission = (permission: PermissionCode): RequestHandler =>
  (_request, response, next) => {
    const access = response.locals.organizationAccess;
    if (access.isOwner || access.permissions.includes(permission)) {
      next();
      return;
    }

    response.status(403).json({message: 'Недостаточно прав для этого действия'});
  };

export const requireAnyPermission = (
  permissions: PermissionCode[],
): RequestHandler => (_request, response, next) => {
  const access = response.locals.organizationAccess;
  if (
    access.isOwner ||
    permissions.some((permission) => access.permissions.includes(permission))
  ) {
    next();
    return;
  }

  response.status(403).json({message: 'Недостаточно прав для этого раздела'});
};
