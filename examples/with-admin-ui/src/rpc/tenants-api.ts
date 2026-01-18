import { mockStore } from "../lib/mock-store.js";
import type { Tenant, TenantPlan } from "../models/tenant.js";

export interface CreateTenantInput {
    name: string;
    slug: string;
    plan: TenantPlan;
}

export interface UpdateTenantInput {
    name?: string;
    slug?: string;
    plan?: TenantPlan;
}

export class TenantsApi {
    public async listTenants(): Promise<Tenant[]> {
        return mockStore.listTenants();
    }

    public async getTenant(id: string): Promise<Tenant | null> {
        return mockStore.getTenant(id);
    }

    public async createTenant(data: CreateTenantInput): Promise<Tenant> {
        return mockStore.createTenant(data);
    }

    public async updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant | null> {
        return mockStore.updateTenant(id, data);
    }

    public async deleteTenant(id: string): Promise<boolean> {
        return mockStore.deleteTenant(id);
    }
}
