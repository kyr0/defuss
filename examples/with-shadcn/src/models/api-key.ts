export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  tenantId: string;
  permissions: string[];
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
}
