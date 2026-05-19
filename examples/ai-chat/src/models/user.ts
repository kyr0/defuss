export type UserRole = "admin" | "user";
export type UserStatus = "active" | "inactive";

export interface User {
	uid: string;
	name: string;
	email: string;
	role: UserRole;
	status: UserStatus;
	createdAt: string;
	lastLoginAt?: string;
}
