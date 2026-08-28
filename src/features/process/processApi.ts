import {apiRequest} from '../../lib/apiClient';

export interface ProcessDepartmentOption {
  id: string;
  name: string;
  parentId: string | null;
}

export interface ProcessPositionOption {
  id: string;
  name: string;
}

export interface ProcessOptions {
  departments: ProcessDepartmentOption[];
  positions: ProcessPositionOption[];
}

export interface ProcessEventInput {
  event: 'created' | 'deleted' | 'draft_reset';
  entityId: string;
  name: string;
  departmentId?: string;
  positionId?: string;
}

export const processApi = {
  options: (slug: string) => apiRequest<ProcessOptions>('/api/processes/options', {organizationSlug: slug}),
  recordEvent: (slug: string, body: ProcessEventInput) => apiRequest('/api/processes/events', {
    organizationSlug: slug,
    method: 'POST',
    body: JSON.stringify(body),
  }),
};
