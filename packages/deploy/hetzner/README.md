# Hetzner + Cloudflare dual-VPS Ansible stack

A small, professional, KISS deployment stack for two Hetzner Cloud Ubuntu VPS origins behind Cloudflare proxied DNS.

## What this does

- provisions **2x Hetzner Cloud VPS** in **`nbg1`**
- uses **`cx23`** as the default lowest-cost current x86 plan in Germany/Finland
- keeps **IPv6 disabled** on the hosts to avoid accidental origin bypass and dual-stack surprises
- uses **Cloudflare proxied DNS** with two `A` records for the same hostname
- assumes **Cloudflare Full (strict)** with a **Cloudflare Origin CA certificate** installed on each origin
- hardens SSH, enables fail2ban, unattended security updates, and host firewalling with **iptables**
- allows **80/443 only from Cloudflare IP ranges** through the Docker path via `DOCKER-USER`
- deploys one container per host using a **rolling update**: host A first, then host B
- supports **local buildx build + upload** and **GitHub Actions build/push + registry deploy**
- keeps **Ansible Vault encrypted secrets** and **Vault-encrypted per-host SSH private keys** in git

## Important design calls

This setup is intentionally conservative:

- **No Hetzner Load Balancer by default.** Cloudflare proxied dual-origin DNS is the cheap option.
- **No Cloudflare Flexible TLS.** Use **Full (strict)** instead.
- **No IPv6-only origin setup.** That is possible, but it adds avoidable complexity for little gain here.
- **No fake “blue/green” theater per node.** This repo uses a simple, reliable rolling deployment across two origins.

## Repo layout

- `playbooks/provision.yml` — create servers, harden them, install Docker, configure Cloudflare DNS
- `playbooks/deploy.yml` — local build or registry pull, then deploy sequentially to A and B
- `inventory/group_vars/all/main.yml` — non-secret defaults
- `inventory/group_vars/all/vault.yml` — encrypted secrets
- `secrets/ssh/*.vault` — encrypted per-host private keys
- `secrets/ssh/public/*.pub` — matching public keys
- `scripts/` — helper scripts for vault and key handling
- `.github/workflows/` — GitHub Actions provision and deploy
- `app/` — sample clustered Node `node:lts` origin container

## One-time prerequisites

1. Register your domain at Hetzner (or keep it there).
2. Add the zone to Cloudflare.
3. Change the authoritative nameservers at Hetzner to the Cloudflare nameservers for that zone.
4. In Cloudflare, create an **Origin CA certificate** for your hostname(s).
5. Use `inventory/group_vars/all/vault.example.yml` as the structure reference, then place your Hetzner API token, Cloudflare API token, and Origin CA cert/key into `inventory/group_vars/all/vault.yml` and encrypt it with Ansible Vault.
6. Replace the placeholder admin SSH public key and allowed admin CIDRs in `inventory/group_vars/all/main.yml`.

## Local usage

Create a local vault password file first if you are not using an environment variable:

```bash
cp .vault_pass.example .vault_pass.txt
chmod 600 .vault_pass.txt
```

```bash
python3 -m pip install -r requirements.txt
ansible-galaxy collection install -r collections/requirements.yml
./scripts/decrypt_ssh_keys.sh
ansible-playbook playbooks/provision.yml
ansible-playbook playbooks/deploy.yml
```

For registry-based deployment:

```bash
ansible-playbook playbooks/deploy.yml -e deploy_via_registry=true -e deploy_registry_image_ref=ghcr.io/YOUR_ORG/YOUR_REPO/webapp:${GIT_SHA}
```

## GitHub Actions secrets

Required repository secret:

- `ANSIBLE_VAULT_PASSWORD`

The workflows assume your real Hetzner token, Cloudflare token, Origin CA certificate, and host SSH keys are already stored in the vaulted files committed to the repo.

## Cloudflare settings to apply

Apply these once in Cloudflare:

- SSL/TLS mode: **Full (strict)**
- Edge certificates: **Always Use HTTPS** enabled
- DNS records for apex and `www`: **Proxied**

## Security notes

- SSH is locked to a custom port and key-only auth.
- Root SSH login is disabled.
- `ops` gets passwordless sudo.
- 80/443 are only allowed from Cloudflare IP ranges.
- Public IPv6 is disabled on the host to avoid accidental exposure.
- The sample app runs as non-root and only gets `NET_BIND_SERVICE`.

## Reality check

This is a strong low-cost setup, but it is not magic. Two VPSs plus Cloudflare free gives you cheap redundancy and rolling deploys. It does **not** give you the full behavior of a paid health-checked load balancer.
