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
