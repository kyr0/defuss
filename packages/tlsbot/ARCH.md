# ARCH

## Goal

Use the same safe code path for every provider:

1. provider plugin creates and removes DNS TXT records,
2. `certbot` performs ACME DNS-01,
3. cert artifacts are copied into a mounted volume,
4. self-signed fallback is generated if nothing succeeds.

That is the whole trick. No hand-rolled ACME state machine. No dependency zoo. No class hierarchy cosplay.

## Why this is the default

The brittle part of certificate issuance is not “call a DNS API”. The brittle part is the ACME protocol lifecycle, renewal semantics, nonce handling, order finalization, and weird corner cases around DNS timing.

So this project deliberately keeps ACME out of the application code.

The bot owns:
- provider selection,
- DNS challenge presentation and cleanup,
- DNS propagation wait loop,
- cert persistence,
- fallback cert generation.

`certbot` owns:
- ACME,
- issuance,
- renewal lineage state.

## Plugin model

Plugins are plain functions returning objects.

A plugin can implement:
- `issue(ctx)`
- `presentChallenge(ctx, challenge)`
- `cleanupChallenge(ctx, challenge)`
- custom CLI subcommands via `commands`

The pipeline order is an array. First successful plugin wins.

Semantics:
- `return null` => plugin skipped, next plugin runs
- `throw` => plugin failed, next plugin runs
- result => pipeline stops successfully

If every plugin skips or fails, the built-in `internal` fallback generates a short-lived self-signed cert.

## Why provider plugins are DNS-only

This keeps all providers on one code path.

That buys us:
- one issuance mechanism,
- one operational model,
- one mounted-volume layout,
- one fallback behavior,
- less surface area to debug.

Even if a provider also offers some native certificate API, mixing certificate backends would make the renewal model split-brained. That is how nice systems become weird systems.

## Filesystem layout

For each target:

- final certs: `outputDir`
- certbot state: `outputDir/.bot-state`
  - `certbot-config`
  - `certbot-work`
  - `certbot-logs`

This makes the mounted volume sufficient for both live cert consumption and future renewals.

## DNS propagation model

After the auth hook creates the TXT record, the bot polls DNS using Node’s built-in resolver.

Behavior:
- prefer authoritative name servers for the zone,
- fall back to system resolver if needed,
- stop when the exact TXT value appears,
- fail after timeout.

Defaults are intentionally simple and overrideable per target.

## Provider strategy notes

### Hetzner
- straight RRSet add/delete
- good fit for subdomain and wildcard flows

### Cloudflare
- resolves `zoneId` automatically if not configured
- deletes only matching TXT records

### Netcup
- uses login + `updateDnsRecords` on the JSON endpoint
- slower propagation by default

### Scaleway
- uses DNS record PATCH changes
- add/delete by exact record payload

## Ubuntu assumptions

This project assumes Ubuntu Linux and two installed binaries:
- `certbot`
- `openssl`

Nothing else is required at the JS package layer.

## Failure behavior

Failure is explicit and boring:
- each plugin failure is isolated,
- the pipeline continues,
- fallback cert is generated,
- a result JSON file records what happened.

That gives a service something to boot with, even when public trust is unavailable.
