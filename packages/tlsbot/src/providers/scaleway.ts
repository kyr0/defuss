import {
  definePlugin,
  getProviderConfig,
  httpJson,
  issueWithCertbotDns,
  secretFromConfig,
  type Challenge,
  type RuntimeContext,
} from "../core.js";

type ScalewayConfig = {
  secretKey?: string;
  secretKeyEnv?: string;
  dnsZone?: string;
  apiBase?: string;
};

const getSecretKey = (ctx: RuntimeContext): string | undefined => {
  const config = getProviderConfig<ScalewayConfig>(ctx, "scaleway");
  return secretFromConfig(config, "secretKey", "secretKeyEnv", "SCW_SECRET_KEY");
};

const zoneFor = (ctx: RuntimeContext): string => {
  const config = getProviderConfig<ScalewayConfig>(ctx, "scaleway");
  return config.dnsZone ?? ctx.target.zone;
};

const apiBase = (ctx: RuntimeContext): string => {
  const config = getProviderConfig<ScalewayConfig>(ctx, "scaleway");
  return config.apiBase ?? "https://api.scaleway.com/domain/v2beta1";
};

const patchRecords = async (ctx: RuntimeContext, secretKey: string, zone: string, body: unknown): Promise<void> => {
  await httpJson(`${apiBase(ctx)}/dns-zones/${encodeURIComponent(zone)}/records`, {
    method: "PATCH",
    headers: {
      "X-Auth-Token": secretKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

/**
 * Create a Scaleway DNS provider plugin.
 *
 * Uses the Scaleway Domains and DNS API to manage TXT records for ACME DNS-01 challenges
 * via the record PATCH endpoint.
 *
 * Required credentials: `SCW_SECRET_KEY` env var or `providers.scaleway.secretKey` in config.
 */
export const scalewayPlugin = () => definePlugin({
  name: "scaleway",
  description: "ACME DNS-01 via Scaleway Domains and DNS API + certbot manual hooks.",
  defaultPropagationSeconds: 180,
  async issue(ctx) {
    if (!getSecretKey(ctx)) {
      return null;
    }
    return issueWithCertbotDns(this, ctx);
  },
  async presentChallenge(ctx, challenge) {
    const secretKey = getSecretKey(ctx);
    if (!secretKey) {
      throw new Error("Scaleway secret key missing. Set providers.scaleway.secretKey or SCW_SECRET_KEY.");
    }

    await patchRecords(ctx, secretKey, zoneFor(ctx), {
      changes: [
        {
          add: {
            records: [
              {
                name: challenge.recordName,
                data: challenge.value,
                type: "TXT",
                ttl: challenge.ttl || 60,
              },
            ],
          },
        },
      ],
    });
  },
  async cleanupChallenge(ctx, challenge) {
    const secretKey = getSecretKey(ctx);
    if (!secretKey) {
      throw new Error("Scaleway secret key missing. Set providers.scaleway.secretKey or SCW_SECRET_KEY.");
    }

    await patchRecords(ctx, secretKey, zoneFor(ctx), {
      changes: [
        {
          delete: {
            id_fields: {
              name: challenge.recordName,
              data: challenge.value,
              type: "TXT",
              ttl: challenge.ttl || 60,
            },
          },
        },
      ],
    });
  },
});
