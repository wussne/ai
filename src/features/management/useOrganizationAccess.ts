import {useEffect, useMemo, useState} from 'react';

import {managementApi} from './managementApi';
import type {OrganizationAccess, PermissionCode} from './management.types';

const EMPTY_ACCESS: OrganizationAccess = {isOwner: false, permissions: []};

export function useOrganizationAccess(slug: string) {
  const [access, setAccess] = useState<OrganizationAccess | null>(null);

  useEffect(() => {
    let current = true;
    setAccess(null);
    managementApi.access(slug)
      .then((next) => { if (current) setAccess(next); })
      .catch((error) => {
        console.error('Failed to load organization access', error);
        if (current) setAccess(EMPTY_ACCESS);
      });
    return () => { current = false; };
  }, [slug]);

  return useMemo(() => {
    const can = (permission: PermissionCode) => Boolean(access?.isOwner || access?.permissions.includes(permission));
    const canAny = (permissions: PermissionCode[]) => Boolean(access?.isOwner || permissions.some((permission) => access?.permissions.includes(permission)));
    return {access, can, canAny, isLoading: access === null};
  }, [access]);
}
