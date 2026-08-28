import {apiRequest} from '../../lib/apiClient';
import type {
  CompanyDetails, DepartmentItem, DirectoryItem, EmployeeInput, EmployeeItem,
  OrganizationAccess, PermissionItem, PositionItem, ResponsibilityItem, RoleItem, EmployeeContext,
  RegulationInput, RegulationItem,
} from './management.types';

const endpoint = (path: string) => `/api/management${path}`;
const json = (body: unknown) => JSON.stringify(body);

export const managementApi = {
  access: (slug: string) => apiRequest<OrganizationAccess>('/api/access', {organizationSlug: slug}),
  company: (slug: string) => apiRequest<{company: CompanyDetails}>(endpoint('/company'), {organizationSlug: slug}),
  updateCompany: (slug: string, body: {name: string; slug: string}) => apiRequest<{company: CompanyDetails}>(endpoint('/company'), {organizationSlug: slug, method: 'PATCH', body: json(body)}),
  deactivateCompany: (slug: string, confirmation: string) => apiRequest<void>(endpoint('/company'), {organizationSlug: slug, method: 'DELETE', body: json({confirmation})}),

  employees: (slug: string) => apiRequest<{employees: EmployeeItem[]}>(endpoint('/employees'), {organizationSlug: slug}),
  employeeContext: (slug: string) => apiRequest<EmployeeContext>(endpoint('/employees/context'), {organizationSlug: slug}),
  createEmployee: (slug: string, body: EmployeeInput) => apiRequest(endpoint('/employees'), {organizationSlug: slug, method: 'POST', body: json(body)}),
  updateEmployee: (slug: string, id: string, body: EmployeeInput) => apiRequest(endpoint(`/employees/${id}`), {organizationSlug: slug, method: 'PATCH', body: json(body)}),
  deleteEmployee: (slug: string, id: string) => apiRequest<void>(endpoint(`/employees/${id}`), {organizationSlug: slug, method: 'DELETE'}),

  departments: (slug: string) => apiRequest<{departments: DepartmentItem[]}>(endpoint('/departments'), {organizationSlug: slug}),
  positions: (slug: string) => apiRequest<{items: PositionItem[]}>(endpoint('/positions'), {organizationSlug: slug}),
  responsibilities: (slug: string) => apiRequest<{items: ResponsibilityItem[]}>(endpoint('/responsibilities'), {organizationSlug: slug}),
  functions: (slug: string) => apiRequest<{items: DirectoryItem[]}>(endpoint('/functions'), {organizationSlug: slug}),
  regulations: (slug: string) => apiRequest<{regulations: RegulationItem[]; functions: DirectoryItem[]}>(endpoint('/regulations'), {organizationSlug: slug}),
  createRegulation: (slug: string, body: RegulationInput) => apiRequest(endpoint('/regulations'), {organizationSlug: slug, method: 'POST', body: json(body)}),
  updateRegulation: (slug: string, id: string, body: RegulationInput) => apiRequest(endpoint(`/regulations/${id}`), {organizationSlug: slug, method: 'PATCH', body: json(body)}),
  approveRegulation: (slug: string, id: string) => apiRequest(endpoint(`/regulations/${id}/approve`), {organizationSlug: slug, method: 'POST'}),
  archiveRegulation: (slug: string, id: string) => apiRequest(endpoint(`/regulations/${id}/archive`), {organizationSlug: slug, method: 'POST'}),
  deleteRegulation: (slug: string, id: string) => apiRequest<void>(endpoint(`/regulations/${id}`), {organizationSlug: slug, method: 'DELETE'}),
  roles: (slug: string) => apiRequest<{roles: RoleItem[]}>(endpoint('/roles'), {organizationSlug: slug}),
  permissions: (slug: string) => apiRequest<{permissions: PermissionItem[]}>(endpoint('/permissions'), {organizationSlug: slug}),

  saveDepartment: (slug: string, id: string | null, body: Omit<DepartmentItem, 'id'>) => apiRequest(endpoint(`/departments${id ? `/${id}` : ''}`), {organizationSlug: slug, method: id ? 'PATCH' : 'POST', body: json(body)}),
  deleteDepartment: (slug: string, id: string) => apiRequest<void>(endpoint(`/departments/${id}`), {organizationSlug: slug, method: 'DELETE'}),
  saveDirectory: (slug: string, path: 'positions' | 'responsibilities' | 'functions', id: string | null, body: object) => apiRequest(endpoint(`/${path}${id ? `/${id}` : ''}`), {organizationSlug: slug, method: id ? 'PATCH' : 'POST', body: json(body)}),
  deleteDirectory: (slug: string, path: 'positions' | 'responsibilities' | 'functions', id: string) => apiRequest<void>(endpoint(`/${path}/${id}`), {organizationSlug: slug, method: 'DELETE'}),
  saveRole: (slug: string, id: string | null, body: Omit<RoleItem, 'id'>) => apiRequest(endpoint(`/roles${id ? `/${id}` : ''}`), {organizationSlug: slug, method: id ? 'PATCH' : 'POST', body: json(body)}),
  deleteRole: (slug: string, id: string) => apiRequest<void>(endpoint(`/roles/${id}`), {organizationSlug: slug, method: 'DELETE'}),
};
