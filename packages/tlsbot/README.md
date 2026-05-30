# tls-cert-bot (WIP)

Tiny no-deps TypeScript TLS cert bot for Ubuntu Linux.

It does one boring thing well:
- tries provider plugins from top to bottom,
- uses `certbot` in manual DNS mode for browser-trusted certificates,
- writes the final certs into a mounted volume,
- falls back to a self-signed cert if the ACME path fails.

## Why this shape

Re-implementing ACME in-house is a delightful way to manufacture flaky edge cases. This project keeps the risky part delegated to `certbot`, while the code here only does:
- plugin selection,
- DNS TXT creation/removal,
- cert persistence,
- safe fallback.

## Requirements on Ubuntu

Install the only two external binaries this project expects:

```bash
sudo apt update
sudo apt install -y certbot openssl
```

Bun is the package manager/runtime expected by the project. There are no npm dependencies.

## Quick start

1. Copy the example config:

```bash
cp tls-cert-bot.config.example.json tls-cert-bot.config.json
```

2. Set provider credentials in env.

3. Issue a certificate:

```bash
bun run src/tls-cert-bot.ts issue --config ./tls-cert-bot.config.json --target prod-example
```

4. Result files land in the target `outputDir`:
- `fullchain.pem`
- `privkey.pem`
- `chain.pem`
- `cert.pem`
- `tls-cert-bot.result.json`

## CLI

### Main pipeline

```bash
bun run src/tls-cert-bot.ts issue --config ./tls-cert-bot.config.json --target prod-example
```

Override provider order for one run:

```bash
bun run src/tls-cert-bot.ts issue \
  --config ./tls-cert-bot.config.json \
  --target prod-example \
  --plugins cloudflare,hetzner
```

Dry-run against Let's Encrypt staging:

```bash
bun run src/tls-cert-bot.ts issue \
  --config ./tls-cert-bot.config.json \
  --target prod-example \
  --dry-run
```

### Provider subcommands

Present a challenge manually:

```bash
bun run src/tls-cert-bot.ts hetzner present \
  --config ./tls-cert-bot.config.json \
  --target prod-example \
  --domain app.example.com \
  --value TOKEN_VALUE
```

Cleanup manually:

```bash
bun run src/tls-cert-bot.ts hetzner cleanup \
  --config ./tls-cert-bot.config.json \
  --target prod-example \
  --domain app.example.com \
  --value TOKEN_VALUE
```

Force fallback cert generation:

```bash
bun run src/tls-cert-bot.ts fallback --config ./tls-cert-bot.config.json --target prod-example
```

List targets and plugins:

```bash
bun run src/tls-cert-bot.ts list --config ./tls-cert-bot.config.json
```

## Plugin API

A plugin is just a function that returns an object.

```ts
import { createTlsCertBot, definePlugin } from './src/tls-cert-bot.ts';

const myPlugin = () => definePlugin({
  name: 'my-dns',
  async issue(ctx) {
    return null;
  },
  async presentChallenge(ctx, challenge) {
    // create TXT record
  },
  async cleanupChallenge(ctx, challenge) {
    // delete TXT record
  },
});

const bot = createTlsCertBot([myPlugin()]);
```

Returning `null` from `issue()` means “skip me”. Throwing means “I tried and failed”. The pipeline catches that and moves on.

## Provider notes

### Hetzner
- Uses Hetzner DNS RRSet add/delete endpoints.
- Cleanup deletes the whole RRSet because that is the clean supported path Hetzner documents in its DNS challenge example.

### Cloudflare
- Uses API token auth.
- If `zoneId` is omitted, the plugin resolves it from the zone name.

### Netcup
- Uses the CCP JSON endpoint.
- `updateDnsRecords` is used with the minimal record set required for add/delete.
- Default propagation timeout is longer because Netcup DNS tends to be slower than the others.

### Scaleway
- Uses the Domains and DNS record PATCH endpoint.
- Works with a managed DNS zone already present in Scaleway.

## Mounted-volume layout

A sane target config on a containerized service is something like:

```json
{
  "name": "prod-example",
  "domains": ["example.com", "*.example.com"],
  "zone": "example.com",
  "outputDir": "/certs/live/example.com"
}
```

Mount `/certs` to the host. The bot keeps certbot state inside `outputDir/.bot-state`, so renewals and lineages survive container restarts.
