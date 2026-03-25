# Lifecycle State Contract Audit

Status: Proposed

Issue:
- #137

Epic:
- #140

## Purpose

Define the canonical lifecycle state contract for Clash Nivo across:

- UCI policy
- backend status fields
- RPC lifecycle methods
- UI state and action gating

This audit exists because the current implementation allows lifecycle ownership to split across incompatible signals. The main observed failure mode is:

- `service_running=false`
- `core_running=true`
- `state="degraded"`

That split is real and has already made `Start`, `Stop`, dashboard `Open`, and status rendering unreliable.

## Key Findings

1. `enable` and `running` are different concepts and must stay different.
- `enable` is a persisted policy flag.
- `running` is the current runtime state.
- `stop` must not mutate `enable`.
- install and upgrade must not force `enable=0`.

2. The current status surface is internally coherent, but it exposes an implementation failure as a steady-state UI state.
- [status.sh](/Users/martinpower/dev/Personal/gorillapowerOpenClash/luci-app-clashnivo/root/usr/share/clashnivo/service/status.sh) computes:
  - `running` only when `enabled=true`, `service_running=true`, and `core_running=true`
  - `degraded` whenever service/core/watchdog ownership is partial
- that is a reasonable detector
- the problem is that the current lifecycle plane can leave the product in that partial state for long periods

3. The accepted lifecycle docs and the shipped runtime are no longer aligned.
- [service-lifecycle.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/service-lifecycle.md) still describes a service-owned lifecycle that hands runtime off to procd
- the shipped implementation has repeatedly allowed the core to run outside a coherent service-owned state
- the UI is still written as if service ownership is the authoritative steady-state model

4. `degraded` is a repair state, not a normal operating state.
- it is useful for diagnosis
- it is not a trustworthy operating state for normal user actions
- the current UI still treats it too much like a partially healthy state

## Current Status Computation

Current derivation in [status.sh](/Users/martinpower/dev/Personal/gorillapowerOpenClash/luci-app-clashnivo/root/usr/share/clashnivo/service/status.sh):

1. `blocked`
- when OpenClash is active and Clash Nivo does not currently own the service

2. `starting`
- when `enabled=true`
- and a busy lifecycle command is `start`, `restart`, or `reload`

3. `running`
- when `enabled=true`
- and `service_running=true`
- and `core_running=true`

4. `degraded`
- when any of these are true:
  - `service_running=true`
  - `core_running=true`
  - `watchdog_running=true`
- but the state did not qualify as `running`

5. `stopped`
- when `enabled=true`
- and none of the partial-runtime conditions are true

6. `disabled`
- fallback when the service is not enabled and there is no partial runtime

This is the current formula. It is not the final contract.

## Current Divergences

### 1. Disabled Is Not A First-Class UX State

The product does not expose a clean `Enable` / `Disable` control on the main runtime surface.

Implication:
- `disabled` can exist in backend state
- but the UI does not yet have a clean primary action model for it

### 2. Degraded Is Overloaded

Today `degraded` means any partial lifecycle ownership, including:

- core running without service ownership
- service ownership without core health
- watchdog residue after failed lifecycle

Those cases should not all imply the same UI affordances.

### 3. `running` Is Redundant But Useful

The API currently exposes both:

- `running`
- `state`

`running` is currently equivalent to:

- `state == "running"`

That redundancy is acceptable for compatibility, but `state` must remain canonical.

## Canonical Field Meanings

### `enabled`

Meaning:
- Clash Nivo is allowed to be started and kept active by the service policy.

Rules:
- persisted in UCI
- must survive upgrade unchanged
- must not be changed by `stop`
- must not be changed by `restart`
- may only be changed by:
  - explicit configuration writes
  - explicit enable/disable product flows

### `service_running`

Meaning:
- the lifecycle plane currently owns a running Clash Nivo service instance.

Rules:
- service-owned signal only
- not a substitute for core health
- must not be inferred from arbitrary `clash` PIDs

### `core_running`

Meaning:
- a Clash Nivo-owned core process is currently alive.

Rules:
- runtime-owned signal only
- must match Clash Nivo-owned process identity
- not a substitute for service lifecycle ownership

### `blocked`

Meaning:
- Clash Nivo is not allowed to claim runtime ownership right now because a guard condition is active.

Current explicit reason:
- `openclash_active`

### `state`

Meaning:
- canonical lifecycle state label for UI and diagnostics

Rules:
- `state` is the primary state surface
- `running` is a compatibility alias only

## Proposed Canonical States

### `disabled`

Definition:
- `enabled=false`
- `service_running=false`
- `core_running=false`
- `blocked=false`

Meaning:
- Clash Nivo is intentionally not allowed to run.

### `stopped`

Definition:
- `enabled=true`
- `service_running=false`
- `core_running=false`
- `blocked=false`
- not in a lifecycle start/restart transition

Meaning:
- Clash Nivo is allowed to run, but is not currently running.

### `blocked`

Definition:
- `blocked=true`
- `service_running=false`
- `core_running=false`

Meaning:
- a guard condition prevents startup

### `starting`

Definition:
- a lifecycle start/restart/reload transition is in progress

Meaning:
- runtime ownership is being established
- this should be transient

### `running`

Definition:
- `enabled=true`
- `service_running=true`
- `core_running=true`

Meaning:
- service ownership and core ownership are aligned

### `degraded`

Definition:
- any partial-runtime condition outside the canonical states above

Meaning:
- lifecycle ownership is inconsistent
- this is a repair/diagnostic state
- not a normal operating state

## Proposed Action Matrix

| State | Start | Stop | Restart | Open Dashboard | Notes |
| --- | --- | --- | --- | --- | --- |
| `disabled` | no | no | no | no | UI needs an explicit `Enable` action if this state remains exposed |
| `stopped` | yes | no | no | no | primary recovery/start state |
| `blocked` | no | no | no | no | must show explicit reason |
| `starting` | no | no | no | no | show progress only |
| `running` | no | yes | yes | yes | normal healthy operating state |
| `degraded` | no | yes | no | no | treat as recovery-only until ownership is repaired |

## Why `degraded` Must Be Recovery-Only

Current UI behavior still allows too much in `degraded`.

That is a mistake because `degraded` currently covers cases where:

- the core is running outside service ownership
- lifecycle cleanup may already be inconsistent
- dashboard visibility would falsely imply a healthy controller plane

So the contract should be:

- `degraded` allows `Stop`
- `degraded` does not allow `Restart`
- `degraded` does not expose dashboard `Open`

If later work narrows `degraded` into multiple repair states, that can change. For now, recovery-only is the safe rule.

## Transition Rules

### Install

- first install should default to `enabled=1`
- first install must not auto-start the runtime
- first install should land in `stopped`, not `disabled`

### Upgrade

- upgrade must preserve `enabled`
- upgrade must not force `disabled`

### Start

- `start` may run from `stopped`
- `start` must fail cleanly from `blocked`
- `start` must not be treated as a valid recovery path from `degraded` until lifecycle ownership is repaired

### Stop

- `stop` must be idempotent
- `stop` must be available from:
  - `running`
  - `degraded`
- `stop` must not mutate `enabled`

### Restart

- `restart` is valid only from `running`
- `restart` must not recurse through ad hoc shell dispatch
- `restart` must not mutate `enabled`

## Immediate Gaps Exposed By This Audit

1. The accepted docs still imply a cleaner service-owned lifecycle than the current product actually delivers.
2. The UI still treats `degraded` too much like a partially healthy runtime.
3. The product lacks an explicit primary UX for `disabled`.
4. Lifecycle actions still rely on an implementation that can leave service/core ownership split.

## Required Follow-On Work

### Feed `#133`

The command-runner refactor must preserve this contract:

- reads stay direct and bounded
- lifecycle stays service-owned
- maintenance jobs move away from `rc.common`

### Feed `#138`

`active_config`, controller settings, and dashboard access must align with the lifecycle contract:

- `Open` should only appear in `running`
- stale active YAML state must not imply healthy runtime access

### Feed UI Work

The Status page should reflect the matrix above:

- `degraded` as recovery-only
- `blocked` with explicit reason
- `disabled` with an explicit enable path if we keep exposing it

## Recommended Decisions

1. Keep `state` as the canonical lifecycle field.
2. Keep `running` only as a compatibility alias of `state == "running"`.
3. Treat `degraded` as recovery-only until service/core ownership is fully coherent.
4. Preserve `enabled=1` by default on install and upgrade.
5. Do not let `stop` or `restart` mutate `enabled`.

## References

- [service-contract.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/decision/service-contract.md)
- [service-status.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/service-status.md)
- [service-lifecycle.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/service-lifecycle.md)
- [rpc-backend-boundary-audit.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/rpc-backend-boundary-audit.md)
- [command-runner-and-job-control.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/command-runner-and-job-control.md)
