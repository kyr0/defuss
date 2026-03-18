import { describe, expect, it } from "vitest";
import { mockStore } from "../src/lib/mock-store";

describe("mock store", () => {
  it("creates and revokes api keys", async () => {
    const before = await mockStore.listApiKeys();
    const result = await mockStore.createApiKey({
      name: "Test Key",
      tenantId: "tenant_001",
      permissions: ["read"],
    });

    expect(result.fullKey.startsWith("dk_live_")).toBe(true);

    const afterCreate = await mockStore.listApiKeys();
    expect(afterCreate.length).toBe(before.length + 1);

    const revoked = await mockStore.revokeApiKey(result.apiKey.id);
    expect(revoked).toBe(true);

    const afterRevoke = await mockStore.listApiKeys();
    expect(afterRevoke.length).toBe(before.length);
  });
});
