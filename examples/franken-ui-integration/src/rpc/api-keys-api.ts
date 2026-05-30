import { mockStore } from "../lib/mock-store.js";
import type { ApiKey } from "../models/api-key.js";

export interface CreateApiKeyInput {
    name: string;
    tenantId: string;
    permissions: string[];
    expiresAt?: string;
}

export class ApiKeysApi {
    public async listApiKeys(tenantId?: string): Promise<ApiKey[]> {
        return mockStore.listApiKeys(tenantId);
    }

    public async createApiKey(data: CreateApiKeyInput): Promise<{ apiKey: ApiKey; fullKey: string }> {
        return mockStore.createApiKey(data);
    }

    public async revokeApiKey(id: string): Promise<boolean> {
        return mockStore.revokeApiKey(id);
    }
}
