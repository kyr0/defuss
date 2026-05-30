import { defineConfig } from "defuss-tlsbot";

export default defineConfig({
  defaultEmail: "ops@example.com",
  defaultServer: "production",
  pluginOrder: ["hetzner", "cloudflare", "netcup", "scaleway"],
  targets: [
    {
      name: "prod-example",
      domains: ["example.com", "*.example.com"],
      zone: "example.com",
      outputDir: "/certs/live/example.com",
      dnsPropagationTimeoutSeconds: 180,
      dnsPropagationIntervalSeconds: 5,
      providers: {
        hetzner: {
          tokenEnv: "HETZNER_DNS_TOKEN",
        },
        cloudflare: {
          tokenEnv: "CLOUDFLARE_API_TOKEN",
          zoneId: "optional-zone-id",
        },
        netcup: {
          customerNumberEnv: "NETCUP_CUSTOMER_NUMBER",
          apiKeyEnv: "NETCUP_API_KEY",
          apiPasswordEnv: "NETCUP_API_PASSWORD",
        },
        scaleway: {
          secretKeyEnv: "SCW_SECRET_KEY",
        },
      },
    },
  ],
});
