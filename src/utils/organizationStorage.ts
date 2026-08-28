export const getOrganizationStorageKey = (
  baseKey: string,
  organizationId: string,
) => `${baseKey}:organization:${organizationId}`;

export const migrateLegacyStorageValue = (
  baseKey: string,
  organizationId: string,
) => {
  const scopedKey = getOrganizationStorageKey(baseKey, organizationId);

  if (localStorage.getItem(scopedKey) === null) {
    const legacyValue = localStorage.getItem(baseKey);
    if (legacyValue !== null) {
      localStorage.setItem(scopedKey, legacyValue);
      localStorage.removeItem(baseKey);
    }
  }

  return scopedKey;
};
