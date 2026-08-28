export interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
}

export interface OrganizationMembership {
  membershipId: string;
  organizationId: string;
  name: string;
  slug: string;
  isOwner: boolean;
  department: string | null;
  position: string | null;
}

export type AuthenticationState =
  | {status: 'loading'}
  | {status: 'anonymous'}
  | {
      status: 'authenticated';
      user: CurrentUser;
      organizations: OrganizationMembership[];
      activeOrganization: OrganizationMembership | null;
    };
