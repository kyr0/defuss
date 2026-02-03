export const stats = {
  totalUsers: 1284,
  activeUsers: 893,
  totalTenants: 24,
  totalApiKeys: 146,
};

export const recentActivity = [
  {
    id: "act_01",
    type: "login",
    description: "Jane Smith logged in from Berlin",
    timestamp: "2026-02-03T06:10:00.000Z",
  },
  {
    id: "act_02",
    type: "user_created",
    description: "New user Michael Park added to Acme Corp",
    timestamp: "2026-02-03T04:30:00.000Z",
  },
  {
    id: "act_03",
    type: "tenant_created",
    description: "Tenant Northwind onboarded",
    timestamp: "2026-02-02T22:45:00.000Z",
  },
  {
    id: "act_04",
    type: "api_key_created",
    description: "API key generated for Omega Labs",
    timestamp: "2026-02-02T20:15:00.000Z",
  },
];

export const users = [
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
];

export const tenants = [
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
];

export const apiKeys = [
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
];
