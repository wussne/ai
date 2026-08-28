import type {AuthenticatedUser} from '../auth/auth.types.js';
import type {OrganizationMembership} from './organization.types.js';
import type {OrganizationAccess} from '../access/access.types.js';

declare global {
  namespace Express {
    interface Locals {
      currentUser: AuthenticatedUser;
      organizationContext: OrganizationMembership;
      organizationAccess: OrganizationAccess;
    }
  }
}

export {};
