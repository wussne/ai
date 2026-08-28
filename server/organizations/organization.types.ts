export interface OrganizationMembership {
  membershipId: string;
  organizationId: string;
  name: string;
  slug: string;
  isOwner: boolean;
  department: string | null;
  position: string | null;
}
