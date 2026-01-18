/**
 * Mock Data Store for Admin UI Demo
 * In-memory store with simulated CRUD operations
 */

import type { User } from "../models/user";
import type { Tenant } from "../models/tenant";
import type { ApiKey } from "../models/api-key";

// --- Simulated delay for realism ---
const delay = (ms: number = 200) => new Promise((r) => setTimeout(r, ms));

// --- ID generators ---
let userIdCounter = 100;
let tenantIdCounter = 10;
let apiKeyIdCounter = 50;

const generateId = (prefix: string, counter: () => number) =>
    `${prefix}_${counter().toString(36)}${Date.now().toString(36)}`;

const generateApiKeySecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "dk_live_";
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// --- Initial Mock Data ---

const initialTenants: Tenant[] = [
    {
        id: "tenant_001",
        name: "Acme Corporation",
        slug: "acme-corp",
        plan: "enterprise",
        userCount: 3,
        apiKeyCount: 2,
        createdAt: "2024-01-15T10:00:00Z",
    },
    {
        id: "tenant_002",
        name: "Startup Labs",
        slug: "startup-labs",
        plan: "pro",
        userCount: 2,
        apiKeyCount: 1,
        createdAt: "2024-03-20T14:30:00Z",
    },
    {
        id: "tenant_003",
        name: "Freelancer Co",
        slug: "freelancer-co",
        plan: "free",
        userCount: 1,
        apiKeyCount: 0,
        createdAt: "2024-06-01T09:00:00Z",
    },
];

const initialUsers: User[] = [
    {
        uid: "user_001",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
        status: "active",
        tenantId: "tenant_001",
        createdAt: "2024-01-15T10:00:00Z",
        lastLoginAt: "2024-12-10T08:30:00Z",
    },
    {
        uid: "user_002",
        name: "Jane Smith",
        email: "jane.smith@acme.com",
        role: "user",
        status: "active",
        tenantId: "tenant_001",
        createdAt: "2024-02-20T11:00:00Z",
        lastLoginAt: "2024-12-09T14:20:00Z",
    },
    {
        uid: "user_003",
        name: "Bob Wilson",
        email: "bob@acme.com",
        role: "viewer",
        status: "inactive",
        tenantId: "tenant_001",
        createdAt: "2024-04-10T09:00:00Z",
    },
    {
        uid: "user_004",
        name: "Alice Johnson",
        email: "alice@startuplabs.io",
        role: "admin",
        status: "active",
        tenantId: "tenant_002",
        createdAt: "2024-03-20T14:30:00Z",
        lastLoginAt: "2024-12-08T16:45:00Z",
    },
    {
        uid: "user_005",
        name: "Charlie Brown",
        email: "charlie@startuplabs.io",
        role: "user",
        status: "suspended",
        tenantId: "tenant_002",
        createdAt: "2024-05-15T10:00:00Z",
    },
    {
        uid: "user_006",
        name: "Diana Prince",
        email: "diana@freelancer.co",
        role: "admin",
        status: "active",
        tenantId: "tenant_003",
        createdAt: "2024-06-01T09:00:00Z",
        lastLoginAt: "2024-12-07T11:00:00Z",
    },
];

const initialApiKeys: ApiKey[] = [
    {
        id: "apikey_001",
        name: "Production API",
        prefix: "dk_live_abc...xyz",
        tenantId: "tenant_001",
        permissions: ["read", "write", "admin"],
        createdAt: "2024-02-01T10:00:00Z",
        lastUsedAt: "2024-12-10T09:15:00Z",
    },
    {
        id: "apikey_002",
        name: "Development Key",
        prefix: "dk_live_dev...123",
        tenantId: "tenant_001",
        permissions: ["read", "write"],
        createdAt: "2024-06-15T14:00:00Z",
        expiresAt: "2025-06-15T14:00:00Z",
    },
    {
        id: "apikey_003",
        name: "Startup Labs API",
        prefix: "dk_live_sla...789",
        tenantId: "tenant_002",
        permissions: ["read", "write"],
        createdAt: "2024-04-01T12:00:00Z",
        lastUsedAt: "2024-12-05T18:30:00Z",
    },
];

// --- In-Memory Store ---
class MockStore {
    private tenants: Tenant[] = [...initialTenants];
    private users: User[] = [...initialUsers];
    private apiKeys: ApiKey[] = [...initialApiKeys];
    private currentSession: { user: User; token: string } | null = null;

    // --- Auth ---
    async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
        await delay();
        // Demo: accept any password for known users, or specific demo credentials
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

    getSession() {
        return this.currentSession;
    }

    // --- Tenants ---
    async listTenants(): Promise<Tenant[]> {
        await delay();
        return [...this.tenants];
    }

    async getTenant(id: string): Promise<Tenant | null> {
        await delay();
        return this.tenants.find((t) => t.id === id) || null;
    }

    async createTenant(data: Omit<Tenant, "id" | "createdAt" | "userCount" | "apiKeyCount">): Promise<Tenant> {
        await delay();
        const tenant: Tenant = {
            ...data,
            id: generateId("tenant", () => ++tenantIdCounter),
            userCount: 0,
            apiKeyCount: 0,
            createdAt: new Date().toISOString(),
        };
        this.tenants.push(tenant);
        return tenant;
    }

    async updateTenant(id: string, data: Partial<Omit<Tenant, "id" | "createdAt">>): Promise<Tenant | null> {
        await delay();
        const idx = this.tenants.findIndex((t) => t.id === id);
        if (idx === -1) return null;
        this.tenants[idx] = { ...this.tenants[idx], ...data };
        return this.tenants[idx];
    }

    async deleteTenant(id: string): Promise<boolean> {
        await delay();
        const idx = this.tenants.findIndex((t) => t.id === id);
        if (idx === -1) return false;
        this.tenants.splice(idx, 1);
        // Also remove associated users and API keys
        this.users = this.users.filter((u) => u.tenantId !== id);
        this.apiKeys = this.apiKeys.filter((k) => k.tenantId !== id);
        return true;
    }

    // --- Users ---
    async listUsers(tenantId?: string): Promise<User[]> {
        await delay();
        if (tenantId) {
            return this.users.filter((u) => u.tenantId === tenantId);
        }
        return [...this.users];
    }

    async getUser(uid: string): Promise<User | null> {
        await delay();
        return this.users.find((u) => u.uid === uid) || null;
    }

    async createUser(data: Omit<User, "uid" | "createdAt">): Promise<User> {
        await delay();
        const user: User = {
            ...data,
            uid: generateId("user", () => ++userIdCounter),
            createdAt: new Date().toISOString(),
        };
        this.users.push(user);
        // Update tenant user count
        const tenant = this.tenants.find((t) => t.id === data.tenantId);
        if (tenant) tenant.userCount++;
        return user;
    }

    async updateUser(uid: string, data: Partial<Omit<User, "uid" | "createdAt">>): Promise<User | null> {
        await delay();
        const idx = this.users.findIndex((u) => u.uid === uid);
        if (idx === -1) return null;
        this.users[idx] = { ...this.users[idx], ...data };
        return this.users[idx];
    }

    async deleteUser(uid: string): Promise<boolean> {
        await delay();
        const idx = this.users.findIndex((u) => u.uid === uid);
        if (idx === -1) return false;
        const user = this.users[idx];
        this.users.splice(idx, 1);
        // Update tenant user count
        const tenant = this.tenants.find((t) => t.id === user.tenantId);
        if (tenant) tenant.userCount = Math.max(0, tenant.userCount - 1);
        return true;
    }

    async toggleUserStatus(uid: string): Promise<User | null> {
        await delay();
        const user = this.users.find((u) => u.uid === uid);
        if (!user) return null;
        user.status = user.status === "active" ? "suspended" : "active";
        return user;
    }

    // --- API Keys ---
    async listApiKeys(tenantId?: string): Promise<ApiKey[]> {
        await delay();
        if (tenantId) {
            return this.apiKeys.filter((k) => k.tenantId === tenantId);
        }
        return [...this.apiKeys];
    }

    async createApiKey(
        data: Pick<ApiKey, "name" | "tenantId" | "permissions" | "expiresAt">
    ): Promise<{ apiKey: ApiKey; fullKey: string }> {
        await delay();
        const fullKey = generateApiKeySecret();
        const apiKey: ApiKey = {
            id: generateId("apikey", () => ++apiKeyIdCounter),
            name: data.name,
            prefix: `${fullKey.slice(0, 12)}...${fullKey.slice(-4)}`,
            tenantId: data.tenantId,
            permissions: data.permissions,
            createdAt: new Date().toISOString(),
            expiresAt: data.expiresAt,
        };
        this.apiKeys.push(apiKey);
        // Update tenant API key count
        const tenant = this.tenants.find((t) => t.id === data.tenantId);
        if (tenant) tenant.apiKeyCount++;
        return { apiKey, fullKey };
    }

    async revokeApiKey(id: string): Promise<boolean> {
        await delay();
        const idx = this.apiKeys.findIndex((k) => k.id === id);
        if (idx === -1) return false;
        const apiKey = this.apiKeys[idx];
        this.apiKeys.splice(idx, 1);
        // Update tenant API key count
        const tenant = this.tenants.find((t) => t.id === apiKey.tenantId);
        if (tenant) tenant.apiKeyCount = Math.max(0, tenant.apiKeyCount - 1);
        return true;
    }

    // --- Dashboard Stats ---
    async getStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        totalTenants: number;
        totalApiKeys: number;
    }> {
        await delay();
        return {
            totalUsers: this.users.length,
            activeUsers: this.users.filter((u) => u.status === "active").length,
            totalTenants: this.tenants.length,
            totalApiKeys: this.apiKeys.length,
        };
    }

    async getRecentActivity(): Promise<
        Array<{
            id: string;
            type: "login" | "user_created" | "tenant_created" | "api_key_created";
            description: string;
            timestamp: string;
        }>
    > {
        await delay();
        // Generate mock recent activity
        return [
            {
                id: "act_001",
                type: "login",
                description: "Admin User logged in",
                timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            },
            {
                id: "act_002",
                type: "user_created",
                description: "New user Jane Smith added to Acme Corporation",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            },
            {
                id: "act_003",
                type: "api_key_created",
                description: "API key 'Production API' created for Acme Corporation",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            },
            {
                id: "act_004",
                type: "tenant_created",
                description: "New tenant 'Startup Labs' created",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            },
            {
                id: "act_005",
                type: "login",
                description: "Alice Johnson logged in",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
            },
        ];
    }
}

// Singleton instance
export const mockStore = new MockStore();
