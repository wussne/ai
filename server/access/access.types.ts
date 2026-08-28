export type PermissionCode =
  | 'company.view'
  | 'company.edit'
  | 'company.delete'
  | 'employee.view'
  | 'employee.create'
  | 'employee.edit'
  | 'employee.delete'
  | 'department.view'
  | 'department.manage'
  | 'position.view'
  | 'position.manage'
  | 'responsibility.view'
  | 'responsibility.manage'
  | 'business_function.view'
  | 'business_function.manage'
  | 'role.view'
  | 'role.manage'
  | 'permission.view'
  | 'log.view'
  | 'regulation.view'
  | 'regulation.create'
  | 'regulation.edit'
  | 'regulation.approve'
  | 'regulation.archive'
  | 'regulation.delete';

export interface OrganizationAccess {
  isOwner: boolean;
  permissions: PermissionCode[];
}
