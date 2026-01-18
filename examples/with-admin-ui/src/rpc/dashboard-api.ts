import { mockStore } from "../lib/mock-store.js";

export interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    totalTenants: number;
    totalApiKeys: number;
}

export interface ActivityItem {
    id: string;
    type: "login" | "user_created" | "tenant_created" | "api_key_created";
    description: string;
    timestamp: string;
}

export class DashboardApi {
    public async getStats(): Promise<DashboardStats> {
        return mockStore.getStats();
    }

    public async getRecentActivity(): Promise<ActivityItem[]> {
        return mockStore.getRecentActivity();
    }
}
