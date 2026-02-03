export type UserRole = "Admin" | "User" | "Viewer";
export type UserStatus = "Active" | "Inactive" | "Suspended";
export type TenantStatus = "Active" | "On Hold" | "Trial";
export type ApiKeyStatus = "Active" | "Revoked";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  tenant: string;
}

export interface Tenant {
  id: string;
  name: string;
  plan: string;
  users: number;
  status: TenantStatus;
}

export interface ApiKey {
  id: string;
  name: string;
  createdBy: string;
  lastUsed: string;
  status: ApiKeyStatus;
}

export interface ActivityItem {
  id: string;
  type: "login" | "user_created" | "tenant_created" | "api_key_created";
  description: string;
  timestamp: string;
}

interface StoreState {
  users: User[];
  tenants: Tenant[];
  apiKeys: ApiKey[];
  activity: ActivityItem[];
}

const now = new Date();

const seed: StoreState = {
  users: [
    {
      id: "usr_01",
      name: "Jane Smith",
      email: "jane.smith@acme.com",
      role: "Admin",
      status: "Active",
      tenant: "Acme Corp",
    },
    {
      id: "usr_02",
      name: "Luis Martinez",
      email: "luis@northwind.io",
      role: "User",
      status: "Active",
      tenant: "Northwind",
    },
    {
      id: "usr_03",
      name: "Priya Patel",
      email: "priya@globex.io",
      role: "Viewer",
      status: "Suspended",
      tenant: "Globex",
    },
    {
      id: "usr_04",
      name: "Kenji Tanaka",
      email: "kenji@umbrella.dev",
      role: "User",
      status: "Inactive",
      tenant: "Umbrella",
    },
  ],
  tenants: [
    {
      id: "ten_01",
      name: "Acme Corp",
      plan: "Enterprise",
      users: 482,
      status: "Active",
    },
    {
      id: "ten_02",
      name: "Northwind",
      plan: "Growth",
      users: 216,
      status: "Active",
    },
    {
      id: "ten_03",
      name: "Globex",
      plan: "Pro",
      users: 112,
      status: "On Hold",
    },
    {
      id: "ten_04",
      name: "Umbrella",
      plan: "Starter",
      users: 44,
      status: "Trial",
    },
  ],
  apiKeys: [
    {
      id: "key_01",
      name: "Production Key",
      createdBy: "Jane Smith",
      lastUsed: "2026-02-02",
      status: "Active",
    },
    {
      id: "key_02",
      name: "Staging Key",
      createdBy: "Luis Martinez",
      lastUsed: "2026-02-01",
      status: "Active",
    },
    {
      id: "key_03",
      name: "Legacy Key",
      createdBy: "Priya Patel",
      lastUsed: "2026-01-24",
      status: "Revoked",
    },
  ],
  activity: [
    {
      id: "act_01",
      type: "login",
      description: "Jane Smith logged in from Berlin",
      timestamp: new Date(now.getTime() - 1000 * 60 * 14).toISOString(),
    },
    {
      id: "act_02",
      type: "user_created",
      description: "New user Michael Park added to Acme Corp",
      timestamp: new Date(now.getTime() - 1000 * 60 * 90).toISOString(),
    },
    {
      id: "act_03",
      type: "tenant_created",
      description: "Tenant Northwind onboarded",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 9).toISOString(),
    },
    {
      id: "act_04",
      type: "api_key_created",
      description: "API key generated for Omega Labs",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 22).toISOString(),
    },
  ],
};

const store: StoreState = structuredClone(seed);

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockStore = {
  async listUsers() {
    await delay();
    return store.users;
  },
  async listTenants() {
    await delay();
    return store.tenants;
  },
  async listApiKeys() {
    await delay();
    return store.apiKeys;
  },
  async getStats() {
    await delay();
    return {
      totalUsers: store.users.length,
      activeUsers: store.users.filter((user) => user.status === "Active").length,
      totalTenants: store.tenants.length,
      totalApiKeys: store.apiKeys.length,
    };
  },
  async getRecentActivity() {
    await delay();
    return store.activity;
  },
  async createUser(input: Omit<User, "id">) {
    await delay();
    const user = { ...input, id: `usr_${Math.random().toString(36).slice(2, 8)}` };
    store.users = [user, ...store.users];
    return user;
  },
  async deleteUser(id: string) {
    await delay();
    store.users = store.users.filter((user) => user.id !== id);
    return { success: true };
  },
};
