export interface ApiKey {
    id: string;
    name: string;
    prefix: string; // Visible part of the key (e.g., "dk_live_abc...")
    tenantId: string; // API keys belong to a tenant
    permissions: string[];
    createdAt: string;
    expiresAt?: string;
    lastUsedAt?: string;
}
