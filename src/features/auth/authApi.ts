import type {CurrentUser, OrganizationMembership} from './auth.types';
import {apiRequest, ApiError} from '../../lib/apiClient';

interface AuthenticationResponse {
  user: CurrentUser;
  organizations: OrganizationMembership[];
}

export {ApiError};

export const getCurrentUser = (): Promise<AuthenticationResponse> =>
  apiRequest('/api/auth/me');

export const login = (email: string, password: string): Promise<AuthenticationResponse> =>
  apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({email, password}),
  });

export const logout = (): Promise<void> =>
  apiRequest('/api/auth/logout', {method: 'POST'});
