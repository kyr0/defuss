export type UserRole = "admin" | "user" | "viewer";
export type UserStatus = "active" | "inactive" | "suspended";

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  tenantId: string;
  createdAt: string;
  lastLoginAt?: string;
}
