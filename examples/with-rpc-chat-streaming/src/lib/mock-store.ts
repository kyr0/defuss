import type { User } from "../models/user";

const delay = (ms: number = 200) => new Promise((r) => setTimeout(r, ms));

const initialUsers: User[] = [
	{
		uid: "user_001",
		name: "Admin User",
		email: "admin@example.com",
		role: "admin",
		status: "active",
		createdAt: "2024-01-15T10:00:00Z",
		lastLoginAt: "2024-12-10T08:30:00Z",
	},
];

class MockStore {
	private users: User[] = [...initialUsers];
	private currentSession: { user: User; token: string } | null = null;

	async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
		await delay();
		const user = this.users.find((u) => u.email === email && u.status === "active");
		if (user || (email === "admin@example.com" && password === "Admin123$")) {
			const loggedInUser = user || this.users[0];
			loggedInUser.lastLoginAt = new Date().toISOString();
			const token = `mock_jwt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
			this.currentSession = { user: loggedInUser, token };
			return { user: loggedInUser, token };
		}
		return null;
	}

	async logout(): Promise<void> {
		await delay(100);
		this.currentSession = null;
	}

	async getCurrentUser(): Promise<User | null> {
		return this.currentSession?.user || null;
	}
}

export const mockStore = new MockStore();
