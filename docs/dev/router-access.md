# Router Access

Local router operations for development are performed through a user-managed SSH alias.

This repository does not store router credentials, private keys, or authorized public keys. Keep all SSH trust material in your local machine configuration.

## Local setup contract

- Create a local SSH alias for router access.
- Point the alias at the router host and user you manage locally.
- Keep the alias and key material outside the repository.

The helper scripts `scripts/router-ssh-test` and `scripts/router-ssh-shell` use a local SSH target from `ROUTER_SSH_HOST` and default to `router-temp`.

For router validation and recovery, prefer the repo-owned wrappers:

- `scripts/router-lifecycle-smoke`
- `scripts/router-recover-openclash`

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

Copy a file to the router using legacy SCP mode:

```sh
scp -O path/to/local/file router-temp:/tmp/remote-file
```

Run the safe lifecycle smoke test:

```sh
scripts/router-lifecycle-smoke
```

Force recovery back to OpenClash:

```sh
scripts/router-recover-openclash
```

## Safe command patterns

Prefer these patterns for router work:

1. Keep the remote command to a single shell layer:

```sh
ssh -o BatchMode=yes router-temp sh -lc 'ps | grep clashnivo | grep -v grep'
```

2. For anything non-trivial, copy a script to `/tmp` and execute it:

```sh
scp -O scripts/router-check.sh router-temp:/tmp/router-check.sh
ssh -o BatchMode=yes router-temp sh /tmp/router-check.sh
```

3. Avoid nested quoting like:

```sh
ssh ... sh -lc 'lua -e '\''... \"...\" ...'\'''
```

That form is brittle and has repeatedly failed in practice.

4. Avoid inline JSON or Lua in the remote one-liner when possible.
- Put JSON in a temporary file.
- Put Lua in a temporary script file.
- Then execute the file remotely.

5. If you need a one-liner, prefer single quotes around the remote shell fragment and avoid additional nested shells inside it.

Bad:

```sh
ssh ... sh -lc 'sh -lc \"...lua/json...\"'
```

Better:

```sh
ssh -o BatchMode=yes router-temp sh -lc 'command arg1 arg2'
```

6. When checking LuCI/backend behavior, prefer file-based probes over inline `lua -e ...`.
- Example: copy a temporary Lua script to `/tmp` and run `lua /tmp/check.lua`.
- This is more reliable than nested inline quoting through SSH.

7. When a router test needs cleanup, never rely on a foreground `/etc/init.d/clashnivo stop` followed by a timeout loop.
- Start `clashnivo stop` in the background.
- Timeout the stop process itself.
- If it does not finish, kill Clash Nivo wrappers/core directly and restore `fw4` + `dnsmasq` before bringing OpenClash back.

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
