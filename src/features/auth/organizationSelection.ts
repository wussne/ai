import type {OrganizationMembership} from './auth.types';

const STORAGE_KEY_PREFIX = 'business_active_organization';

const getStorageKey = (userId: string) => `${STORAGE_KEY_PREFIX}:${userId}`;

export const selectStoredOrganization = (
  userId: string,
  organizations: OrganizationMembership[],
): OrganizationMembership | null => {
  const storedSlug = localStorage.getItem(getStorageKey(userId));
  return (
    organizations.find((organization) => organization.slug === storedSlug) ??
    organizations[0] ??
    null
  );
};

export const storeActiveOrganization = (
  userId: string,
  organization: OrganizationMembership,
) => {
  localStorage.setItem(getStorageKey(userId), organization.slug);
};
