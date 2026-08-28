import {Router, type RequestHandler} from 'express';

import {requireAnyPermission, requirePermission} from '../access/access.middleware.js';
import {canAssignRoleIds, canGrantPermissionIds} from '../access/access.repository.js';
import {createAuditContext} from '../audit/audit.types.js';
import {HttpError, isDatabaseConstraintError} from '../http/http-error.js';
import {deactivateCompany, getCompany, updateCompany} from './company.repository.js';
import {
  deleteDepartment,
  deleteDirectoryItem,
  listDepartments,
  listFunctions,
  listPositions,
  listResponsibilities,
  saveDepartment,
  saveDirectoryItem,
} from './directory.repository.js';
import {createEmployee, listEmployees, removeEmployee, updateEmployee} from './employee.repository.js';
import {deleteRole, listPermissions, listRoles, saveRole} from './role.repository.js';
import {
  approveRegulation,
  archiveRegulation,
  createRegulation,
  deleteRegulation,
  listRegulations,
  updateRegulation,
  type FunctionLink,
} from './regulation.repository.js';
import {
  readBoolean,
  readIdArray,
  readOptionalId,
  readOptionalText,
  readRequiredText,
  validateEmail,
  validatePassword,
  validateSlug,
} from './management.validation.js';

export const managementRouter = Router();

const route = (handler: RequestHandler): RequestHandler => async (request, response, next) => {
  try {
    await handler(request, response, next);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({message: error.message});
      return;
    }
    if (error instanceof Error && ['DEPARTMENT_SELF_PARENT', 'DEPARTMENT_CYCLE'].includes(error.message)) {
      response.status(409).json({message: 'Отдел нельзя сделать дочерним самому себе или своему потомку'});
      return;
    }
    if (isDatabaseConstraintError(error)) {
      if (error.code === '23505') {
        response.status(409).json({message: 'Запись с таким названием или email уже существует'});
        return;
      }
      if (error.code === '23503') {
        response.status(409).json({message: 'Запись используется в других данных. Сначала измените связанные записи.'});
        return;
      }
      if (error.code === '23514') {
        response.status(400).json({message: 'Данные не соответствуют ограничениям базы'});
        return;
      }
    }
    next(error);
  }
};

const organizationId = (response: Parameters<RequestHandler>[1]) =>
  response.locals.organizationContext.organizationId;

const requestAuditContext = (
  request: Parameters<RequestHandler>[0],
  response: Parameters<RequestHandler>[1],
) => createAuditContext(request, response.locals.currentUser, response.locals.organizationContext);

managementRouter.get('/company', requirePermission('company.view'), route(async (_request, response) => {
  response.json({company: await getCompany(organizationId(response))});
}));

managementRouter.patch('/company', requirePermission('company.edit'), route(async (request, response) => {
  const company = await updateCompany(
    organizationId(response),
    readRequiredText(request.body, 'name'),
    validateSlug(readRequiredText(request.body, 'slug', 63)),
    requestAuditContext(request, response),
  );
  response.json({company});
}));

managementRouter.delete('/company', requirePermission('company.delete'), route(async (request, response) => {
  if (readRequiredText(request.body, 'confirmation') !== response.locals.organizationContext.name) {
    throw new HttpError(400, 'Для деактивации введите точное название компании');
  }
  await deactivateCompany(organizationId(response), requestAuditContext(request, response));
  response.status(204).end();
}));

managementRouter.get('/employees', requirePermission('employee.view'), route(async (_request, response) => {
  response.json({employees: await listEmployees(organizationId(response))});
}));

managementRouter.get('/employees/context', requirePermission('employee.view'), route(async (_request, response) => {
  const id = organizationId(response);
  const [departments, positions, responsibilities, roles] = await Promise.all([
    listDepartments(id), listPositions(id), listResponsibilities(id), listRoles(id),
  ]);
  response.json({departments, positions, responsibilities, roles});
}));

const parseEmployee = (body: unknown, requirePassword: boolean) => {
  const passwordValue = (body as Record<string, unknown> | null)?.password;
  const password = typeof passwordValue === 'string' && passwordValue ? validatePassword(passwordValue) : undefined;
  if (requirePassword && !password) throw new HttpError(400, 'Укажите пароль не короче 12 символов');
  return {
    fullName: readRequiredText(body, 'fullName'),
    email: validateEmail(readRequiredText(body, 'email', 254)),
    password,
    departmentId: readOptionalId(body, 'departmentId'),
    positionId: readOptionalId(body, 'positionId'),
    roleIds: readIdArray(body, 'roleIds'),
    responsibilityIds: readIdArray(body, 'responsibilityIds'),
    isActive: readBoolean(body, 'isActive', true),
    isOwner: readBoolean(body, 'isOwner', false),
  };
};

managementRouter.post('/employees', requirePermission('employee.create'), route(async (request, response) => {
  const input = parseEmployee(request.body, true);
  const canManageRoles = response.locals.organizationAccess.isOwner || response.locals.organizationAccess.permissions.includes('role.manage');
  if (input.roleIds.length && !canManageRoles) throw new HttpError(403, 'Для назначения ролей требуется разрешение role.manage');
  if (!(await canAssignRoleIds(organizationId(response), response.locals.organizationAccess, input.roleIds))) {
    throw new HttpError(403, 'Нельзя назначить роль с разрешениями выше ваших');
  }
  await createEmployee(organizationId(response), {...input, password: input.password!}, response.locals.organizationAccess.isOwner, requestAuditContext(request, response));
  response.status(201).json({status: 'created'});
}));

managementRouter.patch('/employees/:id', requirePermission('employee.edit'), route(async (request, response) => {
  const input = parseEmployee(request.body, false);
  if (!(await canAssignRoleIds(organizationId(response), response.locals.organizationAccess, input.roleIds))) {
    throw new HttpError(403, 'Нельзя назначить роль с разрешениями выше ваших');
  }
  await updateEmployee(
    organizationId(response),
    String(request.params.id),
    response.locals.organizationContext.membershipId,
    response.locals.organizationAccess.isOwner,
    response.locals.organizationAccess.isOwner || response.locals.organizationAccess.permissions.includes('role.manage'),
    input,
    requestAuditContext(request, response),
  );
  response.json({status: 'updated'});
}));

managementRouter.delete('/employees/:id', requirePermission('employee.delete'), route(async (request, response) => {
  await removeEmployee(
    organizationId(response),
    String(request.params.id),
    response.locals.organizationContext.membershipId,
    response.locals.organizationAccess.isOwner,
    requestAuditContext(request, response),
  );
  response.status(204).end();
}));

managementRouter.get('/departments', requirePermission('department.view'), route(async (_request, response) => {
  response.json({departments: await listDepartments(organizationId(response))});
}));

const departmentInput = (body: unknown) => ({
  name: readRequiredText(body, 'name'),
  description: readOptionalText(body, 'description'),
  parentId: readOptionalId(body, 'parentId'),
});

managementRouter.post('/departments', requirePermission('department.manage'), route(async (request, response) => {
  await saveDepartment(organizationId(response), null, departmentInput(request.body), requestAuditContext(request, response));
  response.status(201).json({status: 'created'});
}));
managementRouter.patch('/departments/:id', requirePermission('department.manage'), route(async (request, response) => {
  await saveDepartment(organizationId(response), String(request.params.id), departmentInput(request.body), requestAuditContext(request, response));
  response.json({status: 'updated'});
}));
managementRouter.delete('/departments/:id', requirePermission('department.manage'), route(async (request, response) => {
  await deleteDepartment(organizationId(response), String(request.params.id), requestAuditContext(request, response));
  response.status(204).end();
}));

const directoryRoutes = (
  path: 'positions' | 'responsibilities' | 'functions',
  table: 'positions' | 'responsibilities' | 'business_functions',
  viewPermission: 'position.view' | 'responsibility.view' | 'business_function.view',
  managePermission: 'position.manage' | 'responsibility.manage' | 'business_function.manage',
  list: typeof listPositions | typeof listResponsibilities | typeof listFunctions,
  relationKey?: 'responsibilityIds' | 'functionIds',
) => {
  managementRouter.get(`/${path}`, requirePermission(viewPermission), route(async (_request, response) => {
    response.json({items: await list(organizationId(response))});
  }));
  const save = (fromRoute: boolean): RequestHandler => route(async (request, response) => {
    await saveDirectoryItem(
      table,
      organizationId(response),
      fromRoute ? String(request.params.id) : null,
      {name: readRequiredText(request.body, 'name'), description: readOptionalText(request.body, 'description')},
      relationKey ? readIdArray(request.body, relationKey) : [],
      requestAuditContext(request, response),
    );
    response.status(fromRoute ? 200 : 201).json({status: fromRoute ? 'updated' : 'created'});
  });
  managementRouter.post(`/${path}`, requirePermission(managePermission), save(false));
  managementRouter.patch(`/${path}/:id`, requirePermission(managePermission), save(true));
  managementRouter.delete(`/${path}/:id`, requirePermission(managePermission), route(async (request, response) => {
    await deleteDirectoryItem(table, organizationId(response), String(request.params.id), requestAuditContext(request, response));
    response.status(204).end();
  }));
};

directoryRoutes('positions', 'positions', 'position.view', 'position.manage', listPositions, 'responsibilityIds');
directoryRoutes('responsibilities', 'responsibilities', 'responsibility.view', 'responsibility.manage', listResponsibilities, 'functionIds');
directoryRoutes('functions', 'business_functions', 'business_function.view', 'business_function.manage', listFunctions);

const regulationInput = (body: unknown) => {
  const record = body as Record<string, unknown> | null;
  const status = record?.status;
  if (status !== 'draft' && status !== 'review') {
    throw new HttpError(400, 'Редактируемый регламент может быть черновиком или находиться на согласовании');
  }
  const editableStatus: 'draft' | 'review' = status;
  const rawLinks = record?.functionLinks;
  if (!Array.isArray(rawLinks)) throw new HttpError(400, 'Связи с бизнес-функциями заполнены неверно');
  const functionLinks: FunctionLink[] = rawLinks.map((link) => {
    if (typeof link !== 'object' || link === null) throw new HttpError(400, 'Связь с бизнес-функцией заполнена неверно');
    const functionId = (link as Record<string, unknown>).functionId;
    const accessLevel = (link as Record<string, unknown>).accessLevel;
    if (typeof functionId !== 'string' || !/^\d+$/.test(functionId) || !['view', 'edit', 'approve', 'manage'].includes(String(accessLevel))) {
      throw new HttpError(400, 'Связь с бизнес-функцией заполнена неверно');
    }
    return {functionId, accessLevel: accessLevel as FunctionLink['accessLevel']};
  });
  if (new Set(functionLinks.map((link) => link.functionId)).size !== functionLinks.length) {
    throw new HttpError(400, 'Бизнес-функция не может быть привязана дважды');
  }
  const expectedVersion = record?.expectedVersion;
  if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || Number(expectedVersion) < 1)) {
    throw new HttpError(400, 'Номер версии заполнен неверно');
  }
  return {
    title: readRequiredText(body, 'title'),
    description: readOptionalText(body, 'description'),
    content: readRequiredText(body, 'content', 200_000),
    changeDescription: readOptionalText(body, 'changeDescription'),
    status: editableStatus,
    functionLinks,
    expectedVersion: expectedVersion as number | undefined,
  };
};

managementRouter.get('/regulations', requirePermission('regulation.view'), route(async (_request, response) => {
  const id = organizationId(response);
  const [regulations, functions] = await Promise.all([listRegulations(id), listFunctions(id)]);
  response.json({regulations, functions});
}));
managementRouter.post('/regulations', requirePermission('regulation.create'), route(async (request, response) => {
  await createRegulation(
    organizationId(response), response.locals.organizationContext.membershipId, regulationInput(request.body), requestAuditContext(request, response),
  );
  response.status(201).json({status: 'created'});
}));
managementRouter.patch('/regulations/:id', requirePermission('regulation.edit'), route(async (request, response) => {
  await updateRegulation(
    organizationId(response), String(request.params.id), response.locals.organizationContext.membershipId, regulationInput(request.body), requestAuditContext(request, response),
  );
  response.json({status: 'updated'});
}));
managementRouter.post('/regulations/:id/approve', requirePermission('regulation.approve'), route(async (request, response) => {
  await approveRegulation(organizationId(response), String(request.params.id), response.locals.organizationContext.membershipId, requestAuditContext(request, response));
  response.json({status: 'approved'});
}));
managementRouter.post('/regulations/:id/archive', requirePermission('regulation.archive'), route(async (request, response) => {
  await archiveRegulation(organizationId(response), String(request.params.id), requestAuditContext(request, response));
  response.json({status: 'archived'});
}));
managementRouter.delete('/regulations/:id', requirePermission('regulation.delete'), route(async (request, response) => {
  await deleteRegulation(organizationId(response), String(request.params.id), requestAuditContext(request, response));
  response.status(204).end();
}));

managementRouter.get('/roles', requirePermission('role.view'), route(async (_request, response) => {
  response.json({roles: await listRoles(organizationId(response))});
}));
managementRouter.get('/permissions', requireAnyPermission(['permission.view', 'role.manage']), route(async (_request, response) => {
  response.json({permissions: await listPermissions()});
}));
const roleInput = (body: unknown) => ({
  name: readRequiredText(body, 'name'),
  description: readOptionalText(body, 'description'),
  permissionIds: readIdArray(body, 'permissionIds'),
});
managementRouter.post('/roles', requirePermission('role.manage'), route(async (request, response) => {
  const input = roleInput(request.body);
  if (!(await canGrantPermissionIds(response.locals.organizationAccess, input.permissionIds))) {
    throw new HttpError(403, 'Нельзя выдать разрешения, которых нет у вас');
  }
  await saveRole(organizationId(response), null, input, requestAuditContext(request, response));
  response.status(201).json({status: 'created'});
}));
managementRouter.patch('/roles/:id', requirePermission('role.manage'), route(async (request, response) => {
  const roleId = String(request.params.id);
  if (!(await canAssignRoleIds(organizationId(response), response.locals.organizationAccess, [roleId]))) {
    throw new HttpError(403, 'Нельзя изменять роль с разрешениями выше ваших');
  }
  const input = roleInput(request.body);
  if (!(await canGrantPermissionIds(response.locals.organizationAccess, input.permissionIds))) {
    throw new HttpError(403, 'Нельзя выдать разрешения, которых нет у вас');
  }
  await saveRole(organizationId(response), roleId, input, requestAuditContext(request, response));
  response.json({status: 'updated'});
}));
managementRouter.delete('/roles/:id', requirePermission('role.manage'), route(async (request, response) => {
  const roleId = String(request.params.id);
  if (!(await canAssignRoleIds(organizationId(response), response.locals.organizationAccess, [roleId]))) {
    throw new HttpError(403, 'Нельзя удалить роль с разрешениями выше ваших');
  }
  await deleteRole(organizationId(response), roleId, requestAuditContext(request, response));
  response.status(204).end();
}));
