import {useCallback, useEffect, useState} from 'react';

import {
  ApiError,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from './authApi';
import type {AuthenticationState} from './auth.types';
import {
  selectStoredOrganization,
  storeActiveOrganization,
} from './organizationSelection';

const toAuthenticatedState = (
  user: Extract<AuthenticationState, {status: 'authenticated'}>['user'],
  organizations: Extract<AuthenticationState, {status: 'authenticated'}>['organizations'],
): AuthenticationState => ({
  status: 'authenticated',
  user,
  organizations,
  activeOrganization: selectStoredOrganization(user.id, organizations),
});

export function useAuth() {
  const [state, setState] = useState<AuthenticationState>({status: 'loading'});

  useEffect(() => {
    let isCurrent = true;

    getCurrentUser()
      .then(({user, organizations}) => {
        if (isCurrent) setState(toAuthenticatedState(user, organizations));
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.error('Failed to restore authentication session', error);
        }
        setState({status: 'anonymous'});
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const {user, organizations} = await loginRequest(email, password);
    setState(toAuthenticatedState(user, organizations));
  }, []);

  const selectOrganization = useCallback((slug: string) => {
    setState((current) => {
      if (current.status !== 'authenticated') return current;
      const organization = current.organizations.find((item) => item.slug === slug);
      if (!organization) return current;

      storeActiveOrganization(current.user.id, organization);
      return {...current, activeOrganization: organization};
    });
  }, []);

  const updateOrganization = useCallback((organizationId: string, name: string, slug: string) => {
    setState((current) => {
      if (current.status !== 'authenticated') return current;
      const organizations = current.organizations.map((organization) =>
        organization.organizationId === organizationId ? {...organization, name, slug} : organization,
      );
      const activeOrganization = current.activeOrganization?.organizationId === organizationId
        ? {...current.activeOrganization, name, slug}
        : current.activeOrganization;
      if (activeOrganization) storeActiveOrganization(current.user.id, activeOrganization);
      return {...current, organizations, activeOrganization};
    });
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setState({status: 'anonymous'});
  }, []);

  return {...state, login, logout, selectOrganization, updateOrganization};
}
