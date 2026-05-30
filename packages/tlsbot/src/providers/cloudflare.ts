import {
  definePlugin,
  getProviderConfig,
  httpJson,
  issueWithCertbotDns,
  secretFromConfig,
  type Challenge,
  type RuntimeContext,
} from "../core.js";

type CloudflareConfig = {
  token?: string;
  tokenEnv?: string;
  zoneId?: string;
  apiBase?: string;
};

type CloudflareEnvelope<T> = {
  success: boolean;
  result: T;
  errors?: Array<{ code: number; message: string }>;
};

type CloudflareRecord = {
  id: string;
  name: string;
  type: string;
  content: string;
};

type CloudflareZone = {
  id: string;
  name: string;
};

const getToken = (ctx: RuntimeContext): string | undefined => {
  const config = getProviderConfig<CloudflareConfig>(ctx, "cloudflare");
  return secretFromConfig(config, "token", "tokenEnv", "CLOUDFLARE_API_TOKEN");
};

const apiBase = (ctx: RuntimeContext): string => {
  const config = getProviderConfig<CloudflareConfig>(ctx, "cloudflare");
  return config.apiBase ?? "https://api.cloudflare.com/client/v4";
};

const authHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

const resolveZoneId = async (ctx: RuntimeContext, token: string): Promise<string> => {
  const config = getProviderConfig<CloudflareConfig>(ctx, "cloudflare");
  if (config.zoneId) {
    return config.zoneId;
  }

  const url = `${apiBase(ctx)}/zones?name=${encodeURIComponent(ctx.target.zone)}`;
  const data = await httpJson<CloudflareEnvelope<CloudflareZone[]>>(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const zone = data.result.find((candidate) => candidate.name === ctx.target.zone);
  if (!zone) {
    throw new Error(`Cloudflare zone lookup failed for ${ctx.target.zone}`);
  }
  return zone.id;
};

const listTxtRecords = async (ctx: RuntimeContext, token: string, zoneId: string, challenge: Challenge): Promise<CloudflareRecord[]> => {
  const url = `${apiBase(ctx)}/zones/${encodeURIComponent(zoneId)}/dns_records?type=TXT&name=${encodeURIComponent(challenge.recordFqdn)}`;
  const data = await httpJson<CloudflareEnvelope<CloudflareRecord[]>>(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.result ?? [];
};

/**
 * Create a Cloudflare DNS provider plugin.
 *
 * Uses the Cloudflare API to create and remove DNS TXT records for ACME DNS-01 challenges.
 * Automatically resolves `zoneId` from the zone name if not configured.
 *
 * Required credentials: `CLOUDFLARE_API_TOKEN` env var or `providers.cloudflare.token` in config.
 */
export const cloudflarePlugin = () => definePlugin({
  name: "cloudflare",
  description: "ACME DNS-01 via Cloudflare DNS API + certbot manual hooks.",
  defaultPropagationSeconds: 120,
  async issue(ctx) {
    if (!getToken(ctx)) {
      return null;
    }
    return issueWithCertbotDns(this, ctx);
  },
  async presentChallenge(ctx, challenge) {
    const token = getToken(ctx);
    if (!token) {
      throw new Error("Cloudflare token missing. Set providers.cloudflare.token or CLOUDFLARE_API_TOKEN.");
    }

    const zoneId = await resolveZoneId(ctx, token);
    await httpJson(`${apiBase(ctx)}/zones/${encodeURIComponent(zoneId)}/dns_records`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        type: "TXT",
        name: challenge.recordFqdn,
        content: challenge.value,
        ttl: challenge.ttl || 60,
      }),
    });
  },
  async cleanupChallenge(ctx, challenge) {
    const token = getToken(ctx);
    if (!token) {
      throw new Error("Cloudflare token missing. Set providers.cloudflare.token or CLOUDFLARE_API_TOKEN.");
    }

    const zoneId = await resolveZoneId(ctx, token);
    const records = await listTxtRecords(ctx, token, zoneId, challenge);
    for (const record of records) {
      if (record.type === "TXT" && record.name === challenge.recordFqdn && record.content === challenge.value) {
        await httpJson(`${apiBase(ctx)}/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(record.id)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  },
});
