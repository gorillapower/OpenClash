# Service Status

Status: Accepted

Issue:
- #50

Epic:
- #29

## Purpose

Define the first machine-readable service status surface for `clashnivo`.

This ticket moves status detection into the service-owned module tree and makes `/etc/init.d/clashnivo status` return structured JSON with stable field names.

## Status Command

Primary command:

- `/etc/init.d/clashnivo status`

Behavior:

- prints one JSON object to stdout
- returns an exit code with simple operational meaning

Exit codes:

- `0`
  - Clash Nivo service instance is running
- `1`
  - Clash Nivo service is not running and no guard block is currently detected
- `2`
  - Clash Nivo service is not running because a detectable OpenClash runtime conflict exists

The JSON surface is the source of truth for UI/backend consumption. Exit codes are an operational shorthand only.

## Current Fields

Current JSON fields:

- `enabled`
  - whether `clashnivo.config.enable=1`
- `service_running`
  - whether the `clashnivo` procd instance is running
- `core_running`
  - whether a `clash` or `mihomo` core process is currently detected
- `watchdog_running`
  - whether the watchdog procd instance is running
- `openclash_installed`
  - whether OpenClash appears installed via `/etc/init.d/openclash`
- `openclash_enabled`
  - whether the installed OpenClash service is enabled
- `openclash_service_running`
  - whether the OpenClash service instance is running
- `openclash_watchdog_running`
  - whether the OpenClash watchdog instance is running
- `openclash_core_running`
  - whether an OpenClash-owned core process is currently detected
- `openclash_active`
  - whether a detectable OpenClash runtime is active
- `blocked`
  - whether Clash Nivo startup is currently blocked
- `blocked_reason`
  - machine-readable reason string
- `can_start`
  - whether Clash Nivo can currently attempt ownership
- `core_pid`
  - detected core pid when available
- `openclash_core_pid`
  - detected OpenClash-owned core pid when available
- `active_config`
  - current configured config path when present
- `core_type`
  - configured core type from UCI
- `proxy_mode`
  - configured proxy mode from UCI
- `run_mode`
  - configured enable/run mode from UCI

## Current Blocking Rule

The current implementation exposes one explicit blocking reason:

- `openclash_active`

This means:

- OpenClash is installed and active enough to be treated as a runtime conflict
- Clash Nivo has not claimed active runtime ownership

Later Epic 2 guard work may improve the detection internals, but it should preserve the exposed field semantics.

## Ownership Boundary

Status detection now belongs under:

- `root/usr/share/clashnivo/service/status.sh`

Rules:

- `/etc/init.d/clashnivo` should stay a thin entrypoint that delegates status detection
- LuCI backend code should consume the structured surface instead of reimplementing shell heuristics inline
- later tickets may change the detection internals, but should keep the status field contract stable unless the decision docs are updated first

## Transitional Notes

This is the first structured status surface, not the final one.

Still transitional:

- status treats `clashnivo-watchdog` as the only Clash Nivo-owned watchdog identity
- some runtime internals still rely on inherited helper names and process checks

The refined guard signals and blocked-start behavior are implemented separately in:

- `docs/architecture/runtime-guard-implementation.md`

## References

- `docs/decision/service-contract.md`
- `docs/decision/runtime-guard-and-switching.md`
- `docs/architecture/service-skeleton.md`
- `docs/architecture/service-state.md`
