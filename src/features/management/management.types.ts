export type PermissionCode =
  | 'company.view' | 'company.edit' | 'company.delete'
  | 'employee.view' | 'employee.create' | 'employee.edit' | 'employee.delete'
  | 'department.view' | 'department.manage'
  | 'position.view' | 'position.manage'
  | 'responsibility.view' | 'responsibility.manage'
  | 'business_function.view' | 'business_function.manage'
  | 'role.view' | 'role.manage' | 'permission.view'
  | 'log.view'
  | 'regulation.view' | 'regulation.create' | 'regulation.edit'
  | 'regulation.approve' | 'regulation.archive' | 'regulation.delete';

export interface OrganizationAccess {
  isOwner: boolean;
  permissions: PermissionCode[];
}

export interface CompanyDetails {
  id: string; name: string; slug: string; isActive: boolean; createdAt: string; updatedAt: string;
}

export interface DirectoryItem {id: string; name: string; description: string | null}
export interface DepartmentItem extends DirectoryItem {parentId: string | null}
export interface PositionItem extends DirectoryItem {responsibilityIds: string[]}
export interface ResponsibilityItem extends DirectoryItem {functionIds: string[]}
export interface RoleItem extends DirectoryItem {permissionIds: string[]}
export interface PermissionItem extends DirectoryItem {code: string}
export type RegulationStatus = 'draft' | 'review' | 'approved' | 'archived';
export type RegulationAccessLevel = 'view' | 'edit' | 'approve' | 'manage';
export interface RegulationFunctionLink {functionId: string; accessLevel: RegulationAccessLevel}
export interface RegulationItem {
  id: string; title: string; description: string | null; status: RegulationStatus;
  versionNumber: number; content: string; changeDescription: string | null;
  functionLinks: RegulationFunctionLink[]; updatedAt: string;
}
export interface RegulationInput extends Omit<RegulationItem, 'id' | 'versionNumber' | 'updatedAt' | 'status'> {
  status: 'draft' | 'review'; expectedVersion?: number;
}

export interface EmployeeItem {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  departmentId: string | null;
  positionId: string | null;
  roleIds: string[];
  responsibilityIds: string[];
  isActive: boolean;
  isOwner: boolean;
}

export interface EmployeeInput extends Omit<EmployeeItem, 'membershipId' | 'userId'> {
  password?: string;
}

export interface EmployeeContext {
  departments: DepartmentItem[];
  positions: PositionItem[];
  responsibilities: ResponsibilityItem[];
  roles: RoleItem[];
}

export type ManagementArea = 'company' | 'employees' | 'departments' | 'positions' | 'responsibilities' | 'functions' | 'regulations' | 'roles' | 'logs';
