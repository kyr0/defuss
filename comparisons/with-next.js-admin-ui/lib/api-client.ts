import "server-only";
import { cache } from "react";

const BACKEND_URL = process.env.ADMIN_BACKEND_URL ?? "http://127.0.0.1:8000";
const DEMO_AUTH_HEADER = process.env.ADMIN_BACKEND_TOKEN
  ? `Bearer ${process.env.ADMIN_BACKEND_TOKEN}`
  : "Bearer demo-token";

const fetchFromBackend = cache(async <T>(path: string): Promise<T> => {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    cache: "no-store",
    headers: {
      Authorization: DEMO_AUTH_HEADER,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Backend request failed for ${path}: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as T;
});

export interface DashboardData {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalTenants: number;
    totalApiKeys: number;
  };
  activity: Array<{
    id: string;
    type: "login" | "user_created" | "tenant_created" | "api_key_created";
    description: string;
    timestamp: string;
  }>;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "User" | "Viewer";
  status: "Active" | "Inactive" | "Suspended";
  tenant: string;
}

export interface TenantRow {
  id: string;
  name: string;
  plan: string;
  users: number;
  status: "Active" | "On Hold" | "Trial";
}

export interface ApiKeyRow {
  id: string;
  name: string;
  createdBy: string;
  lastUsed: string;
  status: "Active" | "Revoked";
}

export async function getDashboardData() {
  return fetchFromBackend<DashboardData>("/dashboard");
}

export async function getUsers() {
  const data = await fetchFromBackend<{ users: UserRow[] }>("/users");
  return data.users;
}

export async function getTenants() {
  const data = await fetchFromBackend<{ tenants: TenantRow[] }>("/tenants");
  return data.tenants;
}

export async function getApiKeys() {
  const data = await fetchFromBackend<{ apiKeys: ApiKeyRow[] }>("/api-keys");
  return data.apiKeys;
}
