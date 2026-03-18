# Runtime Guard Implementation

Status: Accepted

Issue:
- #51

Epic:
- #29

## Purpose

Record the implemented OpenClash runtime guard for Clash Nivo service start and runtime-activating reload paths.

## Guard Boundary

The runtime guard now lives under:

- `root/usr/share/clashnivo/service/guard.sh`

Rules:

- service-owned guard detection belongs in the service module tree
- `/etc/init.d/clashnivo` and service lifecycle code delegate guard checks to the service module
- status reporting consumes the same guard signals instead of inventing a separate heuristic path

## Detection Model

OpenClash states are separated into:

- `installed`
  - `/etc/init.d/openclash` exists and is executable
- `enabled`
  - `/etc/init.d/openclash enabled` succeeds
- `service_running`
  - `ubus service list` reports a running `openclash` instance
- `watchdog_running`
  - `ubus service list` reports a running `openclash-watchdog` instance
- `core_running`
  - an OpenClash-owned core process is detected from process arguments referencing `/etc/openclash/` or `/usr/share/openclash/`

Current active rule:

- `openclash_active = service_running || watchdog_running || core_running`

Current non-active rule:

- package presence alone does not count as active
- enabled alone does not count as active
- stale temp or log files do not count as active

This matches the accepted decision that install state and active runtime ownership are different facts.

## Blocked Operations

The guard currently blocks:

- `start`
- runtime-activating `reload` paths:
  - `reload firewall`
  - `reload manual`
  - `reload restore`

The guard does not block:

- `stop`
- non-runtime cleanup paths such as `reload revert`

## Failure Behavior

When the guard blocks startup:

- Clash Nivo fails before taking runtime ownership actions
- the blocked reason is set to `openclash_active`
- a parseable JSON error line is emitted on stderr
- service status reports:
  - `openclash_installed`
  - `openclash_enabled`
  - `openclash_service_running`
  - `openclash_watchdog_running`
  - `openclash_core_running`
  - `openclash_active`
  - `blocked`
  - `blocked_reason`
  - `can_start`

Current blocked JSON emission format:

```json
{"blocked":true,"blocked_reason":"openclash_active","context":"start"}
```

The context value varies by operation, for example `reload:firewall`.

## Current Status Semantics

If OpenClash is active and Clash Nivo is not already running:

- `blocked = true`
- `blocked_reason = "openclash_active"`
- `can_start = false`
- `/etc/init.d/clashnivo status` exits with code `2`

If OpenClash is merely installed or enabled but not active:

- `blocked = false`
- `can_start = true`

## Transitional Notes

This is the first implemented guard, not the final one.

Still transitional:

- watchdog naming still contains inherited `openclash` identity
- OpenClash core detection still relies on process-argument inspection rather than a dedicated upstream contract
- RPC start/restart methods do not yet return rich structured guard errors directly; they rely on the service status surface

## References

- `docs/decision/runtime-guard-and-switching.md`
- `docs/decision/service-contract.md`
- `docs/architecture/service-status.md`
