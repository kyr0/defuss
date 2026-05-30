import {
  definePlugin,
  getProviderConfig,
  httpJson,
  issueWithCertbotDns,
  secretFromConfig,
  type Challenge,
  type JsonObject,
  type RuntimeContext,
} from "../core.js";

type NetcupConfig = {
  customerNumber?: string;
  customerNumberEnv?: string;
  apiKey?: string;
  apiKeyEnv?: string;
  apiPassword?: string;
  apiPasswordEnv?: string;
  endpoint?: string;
};

type NetcupResponse<T> = {
  status: string;
  statuscode: number;
  shortmessage: string;
  longmessage: string;
  responsedata: T;
};

type NetcupDnsRecord = {
  id?: string;
  hostname: string;
  type: string;
  destination: string;
  priority?: string;
  deleterecord?: boolean;
  state?: string;
};

const endpointFor = (ctx: RuntimeContext): string => {
  const config = getProviderConfig<NetcupConfig>(ctx, "netcup");
  return config.endpoint ?? "https://ccp.netcup.net/run/webservice/servers/endpoint.php?JSON";
};

const credentials = (ctx: RuntimeContext) => {
  const config = getProviderConfig<NetcupConfig>(ctx, "netcup");
  const customerNumber = secretFromConfig(config, "customerNumber", "customerNumberEnv", "NETCUP_CUSTOMER_NUMBER");
  const apiKey = secretFromConfig(config, "apiKey", "apiKeyEnv", "NETCUP_API_KEY");
  const apiPassword = secretFromConfig(config, "apiPassword", "apiPasswordEnv", "NETCUP_API_PASSWORD");
  return { customerNumber, apiKey, apiPassword };
};

const hasCredentials = (ctx: RuntimeContext): boolean => {
  const creds = credentials(ctx);
  return Boolean(creds.customerNumber && creds.apiKey && creds.apiPassword);
};

const apiCall = async <T>(ctx: RuntimeContext, action: string, param: JsonObject): Promise<T> => {
  const data = await httpJson<NetcupResponse<T>>(endpointFor(ctx), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, param }),
  });

  if (data.status !== "success") {
    throw new Error(`Netcup ${action} failed: ${data.shortmessage} (${data.statuscode}) ${data.longmessage}`);
  }

  return data.responsedata;
};

const withSession = async <T>(ctx: RuntimeContext, fn: (auth: { customernumber: string; apikey: string; apisessionid: string }) => Promise<T>): Promise<T> => {
  const creds = credentials(ctx);
  if (!creds.customerNumber || !creds.apiKey || !creds.apiPassword) {
    throw new Error("Netcup credentials missing. Set customerNumber/apiKey/apiPassword or NETCUP_* env vars.");
  }

  const loginData = await apiCall<{ apisessionid: string }>(ctx, "login", {
    customernumber: creds.customerNumber,
    apikey: creds.apiKey,
    apipassword: creds.apiPassword,
  });

  const auth = {
    customernumber: creds.customerNumber,
    apikey: creds.apiKey,
    apisessionid: loginData.apisessionid,
  };

  try {
    return await fn(auth);
  } finally {
    try {
      await apiCall(ctx, "logout", auth);
    } catch {
      // ignore logout failures
    }
  }
};

const makeRecord = (challenge: Challenge): NetcupDnsRecord => ({
  type: "TXT",
  hostname: challenge.recordName,
  destination: challenge.value,
});

const queryRecords = async (ctx: RuntimeContext, auth: { customernumber: string; apikey: string; apisessionid: string }, challenge: Challenge): Promise<NetcupDnsRecord[]> => {
  const response = await apiCall<{ dnsrecords?: NetcupDnsRecord[] }>(ctx, "infoDnsRecords", {
    ...auth,
    domainname: challenge.zone,
  });
  const target = makeRecord(challenge);
  return (response.dnsrecords ?? []).filter((record) => (
    record.hostname === target.hostname &&
    record.type === target.type &&
    record.destination === target.destination
  ));
};

/**
 * Create a Netcup DNS provider plugin.
 *
 * Uses the Netcup CCP JSON API to manage DNS TXT records for ACME DNS-01 challenges.
 * Sessions are automatically created and destroyed for each operation.
 * Default propagation timeout is longer (900s) due to slower Netcup DNS propagation.
 *
 * Required credentials: `NETCUP_CUSTOMER_NUMBER`, `NETCUP_API_KEY`, `NETCUP_API_PASSWORD`
 * env vars or corresponding config fields.
 */
export const netcupPlugin = () => definePlugin({
  name: "netcup",
  description: "ACME DNS-01 via Netcup CCP DNS API + certbot manual hooks.",
  defaultPropagationSeconds: 900,
  async issue(ctx) {
    if (!hasCredentials(ctx)) {
      return null;
    }
    return issueWithCertbotDns(this, ctx);
  },
  async presentChallenge(ctx, challenge) {
    await withSession(ctx, async (auth) => {
      const existing = await queryRecords(ctx, auth, challenge);
      if (existing.length > 0) {
        return;
      }

      await apiCall(ctx, "updateDnsRecords", {
        ...auth,
        domainname: challenge.zone,
        dnsrecordset: {
          dnsrecords: [makeRecord(challenge)],
        },
      });
    });
  },
  async cleanupChallenge(ctx, challenge) {
    await withSession(ctx, async (auth) => {
      const existing = await queryRecords(ctx, auth, challenge);
      if (existing.length === 0) {
        return;
      }

      await apiCall(ctx, "updateDnsRecords", {
        ...auth,
        domainname: challenge.zone,
        dnsrecordset: {
          dnsrecords: existing.map((record) => ({
            id: record.id,
            hostname: record.hostname,
            type: record.type,
            destination: record.destination,
            priority: record.priority,
            deleterecord: true,
          })),
        },
      });
    });
  },
});
