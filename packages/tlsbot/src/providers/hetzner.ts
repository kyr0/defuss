import {
  definePlugin,
  getProviderConfig,
  hasSiblingIdentifierForSameRecord,
  httpJson,
  issueWithCertbotDns,
  secretFromConfig,
  type Challenge,
  type RuntimeContext,
} from "../core.js";

type HetznerConfig = {
  token?: string;
  tokenEnv?: string;
  apiBase?: string;
};

const getToken = (ctx: RuntimeContext): string | undefined => {
  const config = getProviderConfig<HetznerConfig>(ctx, "hetzner");
  return secretFromConfig(config, "token", "tokenEnv", "HETZNER_DNS_TOKEN");
};

const apiBase = (ctx: RuntimeContext): string => {
  const config = getProviderConfig<HetznerConfig>(ctx, "hetzner");
  return config.apiBase ?? "https://api.hetzner.cloud/v1";
};

const headers = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

const addTxt = async (ctx: RuntimeContext, challenge: Challenge): Promise<void> => {
  const token = getToken(ctx);
  if (!token) {
    throw new Error("Hetzner token missing. Set providers.hetzner.token or HETZNER_DNS_TOKEN.");
  }

  const url = `${apiBase(ctx)}/zones/${encodeURIComponent(challenge.zone)}/rrsets/${encodeURIComponent(challenge.recordName)}/TXT/actions/add_records`;
  await httpJson(url, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      ttl: challenge.ttl || 300,
      records: [{ value: `"${challenge.value}"` }],
    }),
  });
};

const deleteTxt = async (ctx: RuntimeContext, challenge: Challenge): Promise<void> => {
  const token = getToken(ctx);
  if (!token) {
    throw new Error("Hetzner token missing. Set providers.hetzner.token or HETZNER_DNS_TOKEN.");
  }

  if (challenge.remainingChallenges > 0 && hasSiblingIdentifierForSameRecord(challenge)) {
    return;
  }

  const url = `${apiBase(ctx)}/zones/${encodeURIComponent(challenge.zone)}/rrsets/${encodeURIComponent(challenge.recordName)}/TXT`;
  await httpJson(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Create a Hetzner DNS provider plugin.
 *
 * Uses the Hetzner DNS API RRSet endpoints to add and remove TXT records
 * for ACME DNS-01 challenges. Cleanup deletes the entire RRSet.
 *
 * Required credentials: `HETZNER_DNS_TOKEN` env var or `providers.hetzner.token` in config.
 */
export const hetznerPlugin = () => definePlugin({
  name: "hetzner",
  description: "ACME DNS-01 via Hetzner DNS API + certbot manual hooks.",
  defaultPropagationSeconds: 120,
  async issue(ctx) {
    if (!getToken(ctx)) {
      return null;
    }
    return issueWithCertbotDns(this, ctx);
  },
  async presentChallenge(ctx, challenge) {
    await addTxt(ctx, { ...challenge, ttl: challenge.ttl || 300 });
  },
  async cleanupChallenge(ctx, challenge) {
    await deleteTxt(ctx, challenge);
  },
});
