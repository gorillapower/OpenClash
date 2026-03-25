# Router Access

Local router operations for development are performed through a user-managed SSH alias.

This repository does not store router credentials, private keys, or authorized public keys. Keep all SSH trust material in your local machine configuration.

## Local setup contract

- Create a local SSH alias for router access.
- Point the alias at the router host and user you manage locally.
- Keep the alias and key material outside the repository.

The helper scripts `scripts/router-ssh-test` and `scripts/router-ssh-shell` use a local SSH target from `ROUTER_SSH_HOST` and default to `router-temp`.

## Usage

Test non-interactive access:

```sh
scripts/router-ssh-test
```

Open an interactive shell:

```sh
scripts/router-ssh-shell
```

Override the local alias for one command:

```sh
ROUTER_SSH_HOST=my-router scripts/router-ssh-test
```

## Example local key setup

The repository does not manage SSH keys for you, but a dedicated local key is a practical way to keep router access separate from your default SSH identity.

Generate a dedicated key:

```sh
mkdir -p ~/.ssh
chmod 700 ~/.ssh

ssh-keygen -t ed25519 -a 64 \
  -f ~/.ssh/router-root-temp \
  -C "temporary router access $(date +%F)"
```

Add a local alias in `~/.ssh/config`:

```sshconfig
Host router-temp
    HostName 10.0.0.1
    User root
    IdentityFile ~/.ssh/router-root-temp
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new
    UserKnownHostsFile ~/.ssh/known_hosts.router-temp
```

Install the public key on the router:

```sh
PUBKEY="$(cat ~/.ssh/router-root-temp.pub)"
ssh root@10.0.0.1 "umask 077; mkdir -p /etc/dropbear; touch /etc/dropbear/authorized_keys; grep -qxF '$PUBKEY' /etc/dropbear/authorized_keys || echo '$PUBKEY' >> /etc/dropbear/authorized_keys"
```

Test access through the helper:

```sh
scripts/router-ssh-test
```

Remove the public key from the router later:

```sh
PUBKEY="$(cat ~/.ssh/router-root-temp.pub)"
ssh root@10.0.0.1 "grep -vxF '$PUBKEY' /etc/dropbear/authorized_keys > /tmp/authorized_keys.new && cat /tmp/authorized_keys.new > /etc/dropbear/authorized_keys && rm -f /tmp/authorized_keys.new"
```

Remove the local files when the key is no longer needed:

```sh
rm -f ~/.ssh/router-root-temp ~/.ssh/router-root-temp.pub ~/.ssh/known_hosts.router-temp
```

## Notes

- Router access is optional and local-only.
- Do not commit private keys, passwords, or machine-specific SSH trust files.
- If the local alias changes, update your local environment rather than the repository.
