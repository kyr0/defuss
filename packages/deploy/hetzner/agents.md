

<full-context-dump>
./ansible.cfg:
```
[defaults]
inventory = inventory/hosts.generated.yml
host_key_checking = True
stdout_callback = default
interpreter_python = auto_silent
retry_files_enabled = False
forks = 20
nocows = 1
vault_password_file = scripts/vault_pass.sh
collections_path = ./collections:~/.ansible/collections:/usr/share/ansible/collections

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=accept-new

```

./app/Dockerfile:
```
FROM node:lts

RUN apt-get update \
    && apt-get install -y --no-install-recommends libcap2-bin \
    && rm -rf /var/lib/apt/lists/* \
    && setcap 'cap_net_bind_service=+ep' /usr/local/bin/node

WORKDIR /app
COPY package.json server.js ./
RUN chown -R node:node /app
USER node

EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "const https=require('https');const req=https.request({host:'127.0.0.1',port:443,path:'/healthz',rejectUnauthorized:false},res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.end();"
CMD ["node", "server.js"]

```

./app/package.json:
```
{
  "name": "edge-webapp",
  "version": "1.0.0",
  "private": true,
  "description": "Sample clustered Node origin for Cloudflare Full (strict)",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  }
}

```

./app/server.js:
```
'use strict';

const cluster = require('cluster');
const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');

const cpuCount = Math.max(1, os.availableParallelism ? os.availableParallelism() : os.cpus().length);
const httpPort = Number(process.env.APP_HTTP_PORT || 80);
const httpsPort = Number(process.env.APP_HTTPS_PORT || 443);
const certPath = process.env.TLS_CERT_PATH;
const keyPath = process.env.TLS_KEY_PATH;
const forceHttpsRedirect = (process.env.FORCE_HTTPS_REDIRECT || 'true').toLowerCase() === 'true';
const hostname = os.hostname();

function requestHandler(req, res) {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', pid: process.pid, hostname }));
    return;
  }

  if (!req.socket.encrypted && forceHttpsRedirect) {
    const host = req.headers.host || 'localhost';
    res.writeHead(301, { location: `https://${host}${req.url}` });
    res.end();
    return;
  }

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    message: 'edge-webapp is running',
    workerPid: process.pid,
    hostname,
    now: new Date().toISOString()
  }));
}

if (cluster.isPrimary) {
  for (let i = 0; i < cpuCount; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', () => {
    cluster.fork();
  });
} else {
  if (!certPath || !keyPath) {
    throw new Error('TLS_CERT_PATH and TLS_KEY_PATH are required');
  }

  const tlsOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
    minVersion: 'TLSv1.2'
  };

  http.createServer(requestHandler).listen(httpPort, '0.0.0.0');
  https.createServer(tlsOptions, requestHandler).listen(httpsPort, '0.0.0.0');
}

```

./collections/requirements.yml:
```
---
collections:
  - name: hetzner.hcloud
    version: ">=6.7.0"
  - name: community.general
    version: ">=11.4.0"
  - name: community.docker
    version: ">=4.7.0"
  - name: ansible.posix
    version: ">=2.1.0"

```

./inventory/group_vars/all/main.yml:
```
---
project_name: edge-web
project_slug: edge-web

host_a_name: edge-a
host_b_name: edge-b

hcloud_location: nbg1
hcloud_server_type: cx23
hcloud_image: ubuntu-24.04
hcloud_enable_ipv4: true
hcloud_enable_ipv6: false
hcloud_backups: false
hcloud_delete_protection: true
hcloud_rebuild_protection: true

cloudflare_manage_dns: true
cloudflare_zone: example.com
cloudflare_root_record: "@"
cloudflare_www_record: www
cloudflare_proxied: true
cloudflare_ttl: 1

ops_user: ops
ops_group: ops
ssh_port: 2222
ops_admin_authorized_keys:
  - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIREPLACE_WITH_YOUR_REAL_ADMIN_PUBLIC_KEY local-admin"
admin_allowed_cidrs:
  - "203.0.113.10/32"
  - "198.51.100.0/24"

runtime_dir: "{{ playbook_dir | dirname }}/.runtime"
ssh_key_runtime_dir: "{{ runtime_dir }}/ssh"
ssh_key_host_a_private: "{{ ssh_key_runtime_dir }}/id_ops_a"
ssh_key_host_b_private: "{{ ssh_key_runtime_dir }}/id_ops_b"
ssh_key_host_a_public: "{{ playbook_dir | dirname }}/secrets/ssh/public/id_ops_a.pub"
ssh_key_host_b_public: "{{ playbook_dir | dirname }}/secrets/ssh/public/id_ops_b.pub"

inventory_generated_path: "{{ playbook_dir | dirname }}/inventory/hosts.generated.yml"

app_name: webapp
app_container_name: webapp
app_image_name: local/webapp
app_image_tag: latest
app_local_image_ref: "{{ app_image_name }}:{{ app_image_tag }}"
app_build_context: "{{ playbook_dir | dirname }}/app"
app_build_platform: linux/amd64
app_tarball_name: "{{ app_name }}-{{ app_image_tag }}.tar"
app_local_tarball: "{{ runtime_dir }}/build/{{ app_tarball_name }}"
app_remote_tarball: "/tmp/{{ app_tarball_name }}"
app_domain_names:
  - "{{ cloudflare_zone }}"
  - "{{ cloudflare_www_record }}.{{ cloudflare_zone }}"
app_healthcheck_url: https://127.0.0.1/healthz
app_container_user: "1000:1000"
app_enable_http_redirect: true

cloudflare_origin_dir: /etc/ssl/cloudflare-origin
cloudflare_origin_cert_path: "{{ cloudflare_origin_dir }}/origin.crt"
cloudflare_origin_key_path: "{{ cloudflare_origin_dir }}/origin.key"

common_packages:
  - acl
  - apt-transport-https
  - ca-certificates
  - curl
  - docker.io
  - fail2ban
  - gnupg
  - iproute2
  - iptables
  - jq
  - python3-docker
  - rsync
  - unattended-upgrades

container_env_common:
  NODE_ENV: production
  APP_HTTP_PORT: "80"
  APP_HTTPS_PORT: "443"
  TLS_CERT_PATH: /run/secrets/cloudflare-origin/origin.crt
  TLS_KEY_PATH: /run/secrets/cloudflare-origin/origin.key
  APP_DOMAINS: "{{ app_domain_names | join(',') }}"
  FORCE_HTTPS_REDIRECT: "true"

rolling_deploy_batch_size: 1
deploy_via_registry: false
deploy_registry_image_ref: ghcr.io/OWNER/REPO/webapp:latest

```

./inventory/group_vars/all/vault.example.yml:
```
---
vault_hcloud_token: REPLACE_HETZNER_TOKEN
vault_cloudflare_api_token: REPLACE_CLOUDFLARE_API_TOKEN
vault_cloudflare_origin_cert_pem: |
  -----BEGIN CERTIFICATE-----
  REPLACE_WITH_CLOUDFLARE_ORIGIN_CERTIFICATE
  -----END CERTIFICATE-----
vault_cloudflare_origin_key_pem: |
  -----BEGIN PRIVATE KEY-----
  REPLACE_WITH_CLOUDFLARE_ORIGIN_PRIVATE_KEY
  -----END PRIVATE KEY-----
vault_app_env:
  APP_NAME: edge-web
  LOG_LEVEL: info

```

./inventory/group_vars/all/vault.yml:
```
$ANSIBLE_VAULT;1.1;AES256
62336638623261643035633736623237323934353932613634386535373064343838626565666562
3035393430363635366663616430323431383335373532620a313835633331666137643031313535
66333934376466363662363939643862366163336434353165363033346531303134333531393863
6632373032376433310a616639353165633933623134633732353862356164383661326530346532
62373163336532653931393930623464663132396634613630383161363631333166656637363765
37313465343064633138376663666437363962363833303362646538363164663630646632653230
61316131306439623533303235643037663231393061666137616430343635343530633936623232
37326663336466626664303666376131373063303837663961393161663736323733613930383364
66353134306535656231316135653163643134633636373238373835343865636435363038373335
61313961373562336238663935333031626531666638396164303639346265366238626432383530
35383233343161363436626535663036383663633961376230303433653234343365376138653063
34626264646665363636393933366632663934306538353061666266393565323732616239623936
64383464653465646166663238313562653662616538356330313431366530316436363934313436
37333934336135303939663436333737323964646538303531646463343837643138303238343739
62323665336366636336393662326630323633396566366331373566663463336539613031353566
38316239336562653338393835623463396562656137386234633738356235326563353532313066
61623630633531333836323766326163373331333862346533393032393034653762666161643437
64626138356164373137376330306265363931393238613338393531383637313137356363633462
39613266363964613563316133623865613330656663636235656633633636343263316463353631
35313165383865373233663939646637313431363236316662663432646433343338633435303035
61306534366664346335303161633665663837303037333862343732663463666333333636643937
36383438353834663633383862656436316165613264663437643261643338636366623631346565
32613533613165613536653761663862643939613735396134633863373166383061366536336366
65636138336562633131313636663662356362326363303438303337323761666133396632373233
33663837396565666333666533316661306135336339366366326362373237383966363237383661
6164383861663638386134373363306534636235633133386364

```

./inventory/hosts.yml.example:
```
---
all:
  children:
    vps:
      hosts:
        edge-a:
          ansible_host: 203.0.113.11
          ansible_user: ops
          ansible_port: 2222
          ansible_ssh_private_key_file: ./.runtime/ssh/id_ops_a
        edge-b:
          ansible_host: 203.0.113.12
          ansible_user: ops
          ansible_port: 2222
          ansible_ssh_private_key_file: ./.runtime/ssh/id_ops_b

```

./Makefile:
```
SHELL := /bin/bash

.PHONY: init decrypt-ssh provision deploy deploy-registry rekey clean

init:
	python3 -m pip install -r requirements.txt
	ansible-galaxy collection install -r collections/requirements.yml

decrypt-ssh:
	./scripts/decrypt_ssh_keys.sh

provision: decrypt-ssh
	ansible-playbook playbooks/provision.yml

deploy: decrypt-ssh
	ansible-playbook playbooks/deploy.yml

deploy-registry: decrypt-ssh
	ansible-playbook playbooks/deploy.yml -e deploy_via_registry=true

rekey:
	ansible-vault rekey inventory/group_vars/all/vault.yml secrets/ssh/*.vault

clean:
	rm -rf .runtime/build/* .runtime/ssh/* inventory/hosts.generated.yml

```

./playbooks/deploy.yml:
```
---
- name: Build image locally when registry mode is disabled
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../inventory/group_vars/all/main.yml
    - ../inventory/group_vars/all/vault.yml
  tasks:
    - name: Ensure local build directory exists
      ansible.builtin.file:
        path: "{{ runtime_dir }}/build"
        state: directory
        mode: '0755'

    - name: Build the app image locally with buildx
      ansible.builtin.command:
        cmd: >-
          docker buildx build
          --platform {{ app_build_platform }}
          --tag {{ app_local_image_ref }}
          --load
          {{ app_build_context }}
      when: not deploy_via_registry | bool
      changed_when: true

    - name: Export Docker image tarball for upload mode
      ansible.builtin.command:
        cmd: >-
          docker image save --output {{ app_local_tarball }} {{ app_local_image_ref }}
      when: not deploy_via_registry | bool
      changed_when: true

- name: Rolling deployment to VPS origins
  hosts: vps
  serial: "{{ rolling_deploy_batch_size }}"
  become: true
  gather_facts: true
  any_errors_fatal: true
  vars_files:
    - ../inventory/group_vars/all/main.yml
    - ../inventory/group_vars/all/vault.yml
  vars:
    effective_image_ref: >-
      {{ deploy_registry_image_ref if deploy_via_registry | bool else app_local_image_ref }}
    merged_container_env: "{{ container_env_common | combine(vault_app_env, recursive=True) }}"
  tasks:
    - name: Ensure app directory exists
      ansible.builtin.file:
        path: /opt/{{ app_name }}
        state: directory
        owner: root
        group: root
        mode: '0755'

    - name: Upload image tarball to host
      ansible.builtin.copy:
        src: "{{ app_local_tarball }}"
        dest: "{{ app_remote_tarball }}"
        mode: '0644'
      when: not deploy_via_registry | bool

    - name: Load image tarball on host
      ansible.builtin.command:
        cmd: docker image load --input {{ app_remote_tarball }}
      when: not deploy_via_registry | bool
      changed_when: true

    - name: Pull registry image on host
      community.docker.docker_image:
        name: "{{ deploy_registry_image_ref }}"
        source: pull
        force_source: true
      when: deploy_via_registry | bool

    - name: Deploy or replace the container
      community.docker.docker_container:
        name: "{{ app_container_name }}"
        image: "{{ effective_image_ref }}"
        state: started
        recreate: true
        restart_policy: always
        pull: false
        published_ports:
          - "80:80"
          - "443:443"
        env: "{{ merged_container_env }}"
        volumes:
          - "{{ cloudflare_origin_dir }}:/run/secrets/cloudflare-origin:ro"
        read_only: true
        user: "{{ app_container_user }}"
        cap_drop:
          - ALL
        cap_add:
          - NET_BIND_SERVICE
        tmpfs:
          - /tmp:size=64m,mode=1777
        security_opts:
          - no-new-privileges:true
        container_default_behavior: compatibility
        comparisons:
          image: strict

    - name: Wait for application health endpoint
      ansible.builtin.command:
        cmd: curl --fail --silent --show-error --insecure https://127.0.0.1/healthz
      register: app_health
      retries: 30
      delay: 3
      until: app_health.rc == 0
      changed_when: false

    - name: Remove uploaded image tarball
      ansible.builtin.file:
        path: "{{ app_remote_tarball }}"
        state: absent
      when: not deploy_via_registry | bool

- name: Clean up local build artifact
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../inventory/group_vars/all/main.yml
  tasks:
    - name: Remove local image tarball after successful deploy
      ansible.builtin.file:
        path: "{{ app_local_tarball }}"
        state: absent
      when: not deploy_via_registry | bool

```

./playbooks/provision.yml:
```
---
- name: Provision Hetzner Cloud infrastructure and bootstrap hosts
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../inventory/group_vars/all/main.yml
    - ../inventory/group_vars/all/vault.yml
  vars:
    host_matrix:
      - name: "{{ host_a_name }}"
        private_key_file: "{{ ssh_key_host_a_private }}"
        public_key_file: "{{ ssh_key_host_a_public }}"
      - name: "{{ host_b_name }}"
        private_key_file: "{{ ssh_key_host_b_private }}"
        public_key_file: "{{ ssh_key_host_b_public }}"
  tasks:
    - name: Assert vaulted secrets are not placeholder values
      ansible.builtin.assert:
        that:
          - vault_hcloud_token is defined
          - vault_hcloud_token is not match('^REPLACE_')
          - (not cloudflare_manage_dns | bool) or (vault_cloudflare_api_token is defined and vault_cloudflare_api_token is not match('^REPLACE_'))
          - vault_cloudflare_origin_cert_pem is defined
          - vault_cloudflare_origin_cert_pem is not search('REPLACE_WITH_')
          - vault_cloudflare_origin_key_pem is defined
          - vault_cloudflare_origin_key_pem is not search('REPLACE_WITH_')
        fail_msg: Fill inventory/group_vars/all/vault.yml with real values first.

    - name: Assert runtime SSH keys exist
      ansible.builtin.stat:
        path: "{{ item.private_key_file }}"
      loop: "{{ host_matrix }}"
      register: runtime_key_stats

    - name: Fail if decrypted runtime SSH keys are missing
      ansible.builtin.assert:
        that:
          - item.stat.exists
          - item.stat.mode in ['0600', '0400']
        fail_msg: Run ./scripts/decrypt_ssh_keys.sh before provisioning.
      loop: "{{ runtime_key_stats.results }}"

    - name: Register Hetzner SSH keys for bootstrap
      hetzner.hcloud.ssh_key:
        api_token: "{{ vault_hcloud_token }}"
        name: "{{ project_slug }}-{{ item.name }}"
        public_key: "{{ lookup('file', item.public_key_file) | trim }}"
        state: present
      loop: "{{ host_matrix }}"

    - name: Create or update Hetzner servers
      hetzner.hcloud.server:
        api_token: "{{ vault_hcloud_token }}"
        name: "{{ item.name }}"
        server_type: "{{ hcloud_server_type }}"
        image: "{{ hcloud_image }}"
        location: "{{ hcloud_location }}"
        enable_ipv4: "{{ hcloud_enable_ipv4 }}"
        enable_ipv6: "{{ hcloud_enable_ipv6 }}"
        backups: "{{ hcloud_backups }}"
        delete_protection: "{{ hcloud_delete_protection }}"
        rebuild_protection: "{{ hcloud_rebuild_protection }}"
        ssh_keys:
          - "{{ project_slug }}-{{ item.name }}"
        labels:
          project: "{{ project_slug }}"
          role: web
        state: present
      loop: "{{ host_matrix }}"
      register: hcloud_servers

    - name: Add bootstrap hosts to in-memory inventory
      ansible.builtin.add_host:
        name: "{{ item.hcloud_server.name }}"
        groups: bootstrap_vps,vps
        ansible_host: "{{ item.hcloud_server.ipv4_address }}"
        ansible_user: root
        ansible_port: 22
        ansible_ssh_private_key_file: >-
          {{ ssh_key_host_a_private if item.hcloud_server.name == host_a_name else ssh_key_host_b_private }}
        ops_private_key_file: >-
          {{ ssh_key_host_a_private if item.hcloud_server.name == host_a_name else ssh_key_host_b_private }}
        ops_public_key_file: >-
          {{ ssh_key_host_a_public if item.hcloud_server.name == host_a_name else ssh_key_host_b_public }}
        public_ipv4: "{{ item.hcloud_server.ipv4_address }}"
      loop: "{{ hcloud_servers.results }}"

    - name: Wait for SSH on bootstrap port 22
      ansible.builtin.wait_for:
        host: "{{ item.hcloud_server.ipv4_address }}"
        port: 22
        timeout: 300
        delay: 5
      loop: "{{ hcloud_servers.results }}"

    - name: Create Cloudflare apex A records for both origins
      community.general.cloudflare_dns:
        zone: "{{ cloudflare_zone }}"
        record: "{{ cloudflare_root_record }}"
        type: A
        value: "{{ item.hcloud_server.ipv4_address }}"
        proxied: "{{ cloudflare_proxied }}"
        ttl: "{{ cloudflare_ttl }}"
        api_token: "{{ vault_cloudflare_api_token }}"
        state: present
      loop: "{{ hcloud_servers.results }}"
      when: cloudflare_manage_dns | bool

    - name: Create Cloudflare www A records for both origins
      community.general.cloudflare_dns:
        zone: "{{ cloudflare_zone }}"
        record: "{{ cloudflare_www_record }}"
        type: A
        value: "{{ item.hcloud_server.ipv4_address }}"
        proxied: "{{ cloudflare_proxied }}"
        ttl: "{{ cloudflare_ttl }}"
        api_token: "{{ vault_cloudflare_api_token }}"
        state: present
      loop: "{{ hcloud_servers.results }}"
      when: cloudflare_manage_dns | bool

    - name: Render generated inventory for later deploys
      ansible.builtin.template:
        src: templates/hosts.generated.yml.j2
        dest: "{{ inventory_generated_path }}"
        mode: '0600'

- name: Bootstrap and harden VPS hosts
  hosts: bootstrap_vps
  become: true
  gather_facts: true
  vars_files:
    - ../inventory/group_vars/all/main.yml
    - ../inventory/group_vars/all/vault.yml
  handlers:
    - name: restart ssh
      ansible.builtin.service:
        name: ssh
        state: restarted

    - name: restart fail2ban
      ansible.builtin.service:
        name: fail2ban
        state: restarted

    - name: restart docker
      ansible.builtin.service:
        name: docker
        state: restarted

    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: true
  tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600

    - name: Install base packages
      ansible.builtin.apt:
        name: "{{ common_packages }}"
        state: present

    - name: Ensure ops group exists
      ansible.builtin.group:
        name: "{{ ops_group }}"
        state: present

    - name: Ensure ops user exists
      ansible.builtin.user:
        name: "{{ ops_user }}"
        group: "{{ ops_group }}"
        groups: docker
        append: true
        shell: /bin/bash
        create_home: true
        state: present

    - name: Install operator admin public keys
      ansible.posix.authorized_key:
        user: "{{ ops_user }}"
        key: "{{ item }}"
        state: present
      loop: "{{ ops_admin_authorized_keys }}"

    - name: Install per-host deployment key
      ansible.posix.authorized_key:
        user: "{{ ops_user }}"
        key: "{{ lookup('file', hostvars[inventory_hostname].ops_public_key_file) | trim }}"
        state: present

    - name: Allow passwordless sudo for ops
      ansible.builtin.copy:
        dest: /etc/sudoers.d/90-ops
        mode: '0440'
        content: |
          {{ ops_user }} ALL=(ALL) NOPASSWD:ALL

    - name: Configure SSH daemon
      ansible.builtin.template:
        src: templates/sshd_config.j2
        dest: /etc/ssh/sshd_config
        mode: '0600'
        owner: root
        group: root
      notify: restart ssh

    - name: Configure fail2ban jail for SSH
      ansible.builtin.template:
        src: templates/jail.local.j2
        dest: /etc/fail2ban/jail.local
        mode: '0644'
      notify: restart fail2ban

    - name: Configure hardening sysctl values
      ansible.builtin.template:
        src: templates/99-hardening.conf.j2
        dest: /etc/sysctl.d/99-hardening.conf
        mode: '0644'

    - name: Apply sysctl values
      ansible.builtin.command: sysctl --system
      changed_when: true

    - name: Configure Docker daemon
      ansible.builtin.template:
        src: templates/daemon.json.j2
        dest: /etc/docker/daemon.json
        mode: '0644'
      notify: restart docker

    - name: Ensure Docker service is enabled
      ansible.builtin.service:
        name: docker
        enabled: true
        state: started

    - name: Enable unattended upgrades
      ansible.builtin.copy:
        dest: /etc/apt/apt.conf.d/20auto-upgrades
        mode: '0644'
        content: |
          APT::Periodic::Update-Package-Lists "1";
          APT::Periodic::Unattended-Upgrade "1";

    - name: Create Cloudflare origin certificate directory
      ansible.builtin.file:
        path: "{{ cloudflare_origin_dir }}"
        state: directory
        owner: root
        group: root
        mode: '0700'

    - name: Install Cloudflare origin certificate
      ansible.builtin.copy:
        dest: "{{ cloudflare_origin_cert_path }}"
        content: "{{ vault_cloudflare_origin_cert_pem }}\n"
        owner: root
        group: root
        mode: '0644'

    - name: Install Cloudflare origin private key
      ansible.builtin.copy:
        dest: "{{ cloudflare_origin_key_path }}"
        content: "{{ vault_cloudflare_origin_key_pem }}\n"
        owner: root
        group: root
        mode: '0600'

    - name: Install host firewall script
      ansible.builtin.template:
        src: templates/apply-host-firewall.sh.j2
        dest: /usr/local/sbin/apply-host-firewall.sh
        mode: '0750'

    - name: Install Docker Cloudflare firewall updater script
      ansible.builtin.template:
        src: templates/apply-docker-cloudflare.sh.j2
        dest: /usr/local/sbin/apply-docker-cloudflare.sh
        mode: '0750'

    - name: Install firewall systemd service
      ansible.builtin.copy:
        dest: /etc/systemd/system/host-firewall.service
        mode: '0644'
        content: |
          [Unit]
          Description=Apply host INPUT firewall
          After=network-online.target
          Wants=network-online.target

          [Service]
          Type=oneshot
          ExecStart=/usr/local/sbin/apply-host-firewall.sh

          [Install]
          WantedBy=multi-user.target
      notify: reload systemd

    - name: Install Docker Cloudflare firewall service
      ansible.builtin.copy:
        dest: /etc/systemd/system/docker-cloudflare-firewall.service
        mode: '0644'
        content: |
          [Unit]
          Description=Allow only Cloudflare to reach Docker 80/443
          After=network-online.target docker.service
          Wants=network-online.target
          Requires=docker.service

          [Service]
          Type=oneshot
          ExecStart=/usr/local/sbin/apply-docker-cloudflare.sh
      notify: reload systemd

    - name: Install Docker Cloudflare firewall timer
      ansible.builtin.copy:
        dest: /etc/systemd/system/docker-cloudflare-firewall.timer
        mode: '0644'
        content: |
          [Unit]
          Description=Refresh Cloudflare IP allowlist for Docker

          [Timer]
          OnBootSec=2min
          OnUnitActiveSec=12h
          Persistent=true

          [Install]
          WantedBy=timers.target
      notify: reload systemd

    - name: Flush handlers before enabling services
      ansible.builtin.meta: flush_handlers

    - name: Enable and run firewall services
      ansible.builtin.systemd:
        name: "{{ item }}"
        enabled: true
        state: started
      loop:
        - host-firewall.service
        - docker-cloudflare-firewall.service

    - name: Enable Docker Cloudflare firewall timer
      ansible.builtin.systemd:
        name: docker-cloudflare-firewall.timer
        enabled: true
        state: started

- name: Wait for hardened SSH port and validate connectivity
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../inventory/group_vars/all/main.yml
  tasks:
    - name: Wait for custom SSH port
      ansible.builtin.wait_for:
        host: "{{ hostvars[item].ansible_host }}"
        port: "{{ ssh_port }}"
        timeout: 180
        delay: 5
      loop:
        - "{{ host_a_name }}"
        - "{{ host_b_name }}"

```

./playbooks/templates/99-hardening.conf.j2:
```
# Managed by Ansible
net.ipv4.ip_forward = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
kernel.randomize_va_space = 2
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1

```

./playbooks/templates/apply-docker-cloudflare.sh.j2:
```
#!/usr/bin/env bash
set -euo pipefail

CHAIN="DOCKER-USER"
TMP_V4="$(mktemp)"
trap 'rm -f "$TMP_V4"' EXIT

curl --fail --silent --show-error https://www.cloudflare.com/ips-v4 -o "$TMP_V4"

iptables -N "$CHAIN" 2>/dev/null || true
iptables -F "$CHAIN"

while read -r cidr; do
  [[ -z "$cidr" ]] && continue
  iptables -A "$CHAIN" -p tcp -s "$cidr" -m multiport --dports 80,443 -j RETURN
done < "$TMP_V4"

iptables -A "$CHAIN" -p tcp -m multiport --dports 80,443 -j DROP
iptables -A "$CHAIN" -j RETURN

```

./playbooks/templates/apply-host-firewall.sh.j2:
```
#!/usr/bin/env bash
set -euo pipefail

iptables -F INPUT
iptables -P INPUT DROP
iptables -P OUTPUT ACCEPT

iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p icmp -j ACCEPT
{% for cidr in admin_allowed_cidrs %}
iptables -A INPUT -p tcp -s {{ cidr }} --dport {{ ssh_port }} -m conntrack --ctstate NEW -j ACCEPT
{% endfor %}

```

./playbooks/templates/daemon.json.j2:
```
{
  "live-restore": true,
  "icc": false,
  "userland-proxy": false,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

```

./playbooks/templates/hosts.generated.yml.j2:
```
---
all:
  children:
    vps:
      hosts:
{% for item in hcloud_servers.results %}
        {{ item.hcloud_server.name }}:
          ansible_host: {{ item.hcloud_server.ipv4_address }}
          ansible_user: {{ ops_user }}
          ansible_port: {{ ssh_port }}
          ansible_ssh_private_key_file: {{ ssh_key_host_a_private if item.hcloud_server.name == host_a_name else ssh_key_host_b_private }}
{% endfor %}

```

./playbooks/templates/jail.local.j2:
```
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = {{ ssh_port }}
logpath = %(sshd_log)s

```

./playbooks/templates/sshd_config.j2:
```
# Managed by Ansible
Port {{ ssh_port }}
Protocol 2
AddressFamily inet
ListenAddress 0.0.0.0
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
UsePAM yes
PermitEmptyPasswords no
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PermitTunnel no
ClientAliveInterval 300
ClientAliveCountMax 2
TCPKeepAlive no
AllowUsers {{ ops_user }}
AuthorizedKeysFile .ssh/authorized_keys
Subsystem sftp /usr/lib/openssh/sftp-server

```

./requirements.txt:
```
ansible-core>=2.20.0,<2.21.0
requests>=2.32.0
PyYAML>=6.0

```

./scripts/decrypt_ssh_keys.sh:
```
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime/ssh"
mkdir -p "$RUNTIME_DIR"

for src in "$ROOT_DIR"/secrets/ssh/*.vault; do
  [[ -e "$src" ]] || continue
  base="$(basename "$src" .vault)"
  ansible-vault view --vault-password-file "$ROOT_DIR/scripts/vault_pass.sh" "$src" > "$RUNTIME_DIR/$base"
  chmod 600 "$RUNTIME_DIR/$base"
done

```

./scripts/encrypt_ssh_keys.sh:
```
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for src in "$ROOT_DIR"/.runtime/ssh/id_ops_*; do
  [[ -e "$src" ]] || continue
  dst="$ROOT_DIR/secrets/ssh/$(basename "$src").vault"
  cp "$src" "$dst.plain"
  ansible-vault encrypt --encrypt-vault-id default --vault-password-file "$ROOT_DIR/scripts/vault_pass.sh" "$dst.plain"
  mv "$dst.plain" "$dst"
done

```

./scripts/rotate_host_keys.sh:
```
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ROOT_DIR
python3 - <<'PY'
import os
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
root = Path(os.environ['ROOT_DIR'])
(root / '.runtime/ssh').mkdir(parents=True, exist_ok=True)
(root / 'secrets/ssh/public').mkdir(parents=True, exist_ok=True)
for suffix, name in (('a', 'edge-a'), ('b', 'edge-b')):
    key = Ed25519PrivateKey.generate()
    priv = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.OpenSSH,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub = key.public_key().public_bytes(
        encoding=serialization.Encoding.OpenSSH,
        format=serialization.PublicFormat.OpenSSH,
    ) + f' ansible-{name}\n'.encode()
    (root / '.runtime/ssh' / f'id_ops_{suffix}').write_bytes(priv)
    (root / 'secrets/ssh/public' / f'id_ops_{suffix}.pub').write_bytes(pub)
PY
"$ROOT_DIR/scripts/encrypt_ssh_keys.sh"

```

./scripts/vault_origin_cert.sh:
```
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 /path/to/origin.crt /path/to/origin.key" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_CONTENT="$(sed 's/^/    /' "$1")"
KEY_CONTENT="$(sed 's/^/    /' "$2")"
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

cat > "$TMP_FILE" <<EOF2
---
vault_hcloud_token: REPLACE_HETZNER_TOKEN
vault_cloudflare_api_token: REPLACE_CLOUDFLARE_API_TOKEN
vault_cloudflare_origin_cert_pem: |
$CERT_CONTENT
vault_cloudflare_origin_key_pem: |
$KEY_CONTENT
vault_app_env:
  APP_NAME: edge-web
  LOG_LEVEL: info
EOF2

ansible-vault encrypt --encrypt-vault-id default --vault-password-file "$ROOT_DIR/scripts/vault_pass.sh" --output "$ROOT_DIR/inventory/group_vars/all/vault.yml" "$TMP_FILE"

```

./scripts/vault_pass.sh:
```
#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -n "${ANSIBLE_VAULT_PASSWORD:-}" ]]; then
  printf '%s' "$ANSIBLE_VAULT_PASSWORD"
elif [[ -n "${VAULT_PASSWORD:-}" ]]; then
  printf '%s' "$VAULT_PASSWORD"
elif [[ -f "$ROOT_DIR/.vault_pass.txt" ]]; then
  tr -d '\r\n' < "$ROOT_DIR/.vault_pass.txt"
else
  echo "Missing vault password. Set ANSIBLE_VAULT_PASSWORD or create .vault_pass.txt" >&2
  exit 1
fi

```

./secrets/ssh/id_ops_a.vault:
```
$ANSIBLE_VAULT;1.1;AES256
38396231356464363062623664306562663339356630333631313362653231363239643164633738
3763316531366536303630643230316138633066396130360a616635303438656537656262323231
63663138323464356433396533646366306233313637356435373430633465326361326534616531
3939303736353535390a353134373339316438393439643736323131363464613534303731633738
61646136313135386366663438643465383231316164353538666336653366383065666165396438
64626630396636393235343538386563306631616639366530656632356134646338616635623430
62633262613664356465316364613762626665646538316234663532333936373231613238626236
65653433386166363766373435663036383864306539373062343931326630646130386163663230
63326366656139353462666532323665326536663438353439346330626333363531376534373731
39613163343334333936303935626634386561663836623435633164393938396334343630356533
32633463353235376135366338393764373234326266643166353235666264636562363430356366
62626631636438366463333930353237326663383963626264353263336334383862613534633836
39653731333230386430353038373936393164663263346266656365363561366233313436383665
38326430643634373330346462303763383332663562323836616130653835353530356439613738
66303161366535633937376631393132323264623665373564626132326138336233666161353037
35663939306434396633313833366563316234323033393964353862303566353464643161353636
63376637313333633631353739316433396336336533333465613134356435383736656261666239
61393965353763313733326334633531343139663761313631363966326534663562663638616339
37373832626232323065336239616236663262623465376666663737663532356665326132326333
64366230343532303837306430313730663733306539353933666432663130613732633433633531
31326466303766303333323233613134623833636232633633636163633837633163316164383633
33316538616635396165656665653138663230306634383832616464636639623864643230366538
32326333363039373464626237653462633030316638393162353336313134646366396438653137
65346634616265613439

```

./secrets/ssh/id_ops_b.vault:
```
$ANSIBLE_VAULT;1.1;AES256
61326136333834323836316336306338313836353339396662313565376264363938663735663632
6264616538616231333364336632646234333630393532350a653032633939643862653464353866
66326562646664633531353066343137363361356333343037653937396634666136373966346430
6166666664316564390a643531353234326237626532646530616463346365333265626532643434
61343664323364303864663861666336376231623832306365333236663363666331393730663636
34623634313933353834323937386361376665303361336266623235613137623064353837343835
65616466323836316266613162326261363566663765383964646331623235663061343332323134
30396536343633343733326533353936386638343732366464326430333664393432636564336430
37393730393036323466336163363536323532626139366439383734363430666534633932386234
65346433383537636330643562323136313639653566396165646131343864643864346262346434
36313631613336343734366133633535386264333732333835373964363734333738333731306333
32323031396636633636653361623161346233666336336231333338333839616534666533663332
63353762393739613339653636343961646465386230643264376530616535663334643265373566
30386437633062366237663962643937623134303430656563393331383635323765626466313336
30626431303562383530623932656662383135663838336433346230616462313132343236393763
64383737626561643962396336366139306661363366366235336366616136656437386632663130
64623362643630656133343431613534393031303132663437643833356132623965643761336633
31343134336464626630663234323464616232626138353362373738333538333230336434353665
65393465663764653566383339323137363165303030323764636161313739663366303433646364
34396230313433373233376534643237323665306632336163656161656438303836303137333836
64373233363531623966656134393266323934366338653835626166616165636533613035356561
30336439663862663263326234626163363638313836633131323638366533663464633164373739
34333835303735346239366436313039393037386138363262636639633935306263653562373736
63363262316466316631

```

./secrets/ssh/public/id_ops_a.pub:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK040Kxx4t3mpPW4hO9YCiIdkuQT6OFXr4tafECg9XO1 ansible-edge-a

```

./secrets/ssh/public/id_ops_b.pub:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMxCaAHjpa2cXEg2AQHAz1kHqmlKgwws4pF9gS/U2YQB ansible-edge-b

```


</full-context-dump>
