export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
}

export interface UserWithPassword extends AuthenticatedUser {
  passwordHash: string;
  isActive: boolean;
}
