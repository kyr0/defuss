import { mockStore } from "../lib/mock-store.js";
import type { User, UserRole, UserStatus } from "../models/user.js";

export interface CreateUserInput {
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    tenantId: string;
}

export interface UpdateUserInput {
    name?: string;
    email?: string;
    role?: UserRole;
    status?: UserStatus;
    tenantId?: string;
}

export class UsersApi {
    public async listUsers(tenantId?: string): Promise<User[]> {
        return mockStore.listUsers(tenantId);
    }

    public async getUser(uid: string): Promise<User | null> {
        return mockStore.getUser(uid);
    }

    public async createUser(data: CreateUserInput): Promise<User> {
        return mockStore.createUser(data);
    }

    public async updateUser(uid: string, data: UpdateUserInput): Promise<User | null> {
        return mockStore.updateUser(uid, data);
    }

    public async deleteUser(uid: string): Promise<boolean> {
        return mockStore.deleteUser(uid);
    }

    public async toggleUserStatus(uid: string): Promise<User | null> {
        return mockStore.toggleUserStatus(uid);
    }
}
