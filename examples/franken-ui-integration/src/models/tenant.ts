export type TenantPlan = "free" | "pro" | "enterprise";

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan: TenantPlan;
    userCount: number;
    apiKeyCount: number;
    createdAt: string;
}
