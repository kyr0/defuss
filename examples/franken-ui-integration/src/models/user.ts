export type UserRole = "admin" | "user" | "viewer";
export type UserStatus = "active" | "inactive" | "suspended";

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  tenantId: string; // Users belong to a tenant
  createdAt: string;
  lastLoginAt?: string;
}
