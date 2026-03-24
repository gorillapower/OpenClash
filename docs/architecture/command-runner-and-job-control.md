# Command Runner And Job Control Refactor

Status: Proposed

## Purpose

Record the next backend architecture step for Clash Nivo after the lifecycle stabilization fixes. The current backend still routes too many page-driven actions through `/etc/init.d/clashnivo` and `rc.common` as if they were a clean asynchronous application API. Router debugging has shown that assumption is false.

This document defines:

- the problem statement
- the target backend split between service lifecycle and application jobs
- the migration sequence
- the first commands that should move

## Problem Statement

The regenerated UI behaves like a small application:

- multiple top-level pages
- explicit mutations
- async jobs
- polling
- cached status surfaces
- independent inventory and runtime views

The backend still delegates many of those actions to the init entrypoint:

- `/etc/init.d/clashnivo start`
- `/etc/init.d/clashnivo refresh_source ...`
- `/etc/init.d/clashnivo update_dashboard ...`
- `/etc/init.d/clashnivo update_* ...`

That is the wrong contract boundary.

`rc.common` is a service lifecycle wrapper, not a general-purpose async command bus. On OpenWrt and GL firmware this has repeatedly caused:

- wrapper shells stuck in `do_wait`
- request ownership leaks between LuCI CGI and background work
- stale command wrappers after the real job already completed
- lifecycle calls hanging before the lifecycle body even logs
- mixed responsibility between service management and maintenance jobs
- UI state drifting from actual runtime state

The issue is not that shell scripts exist. The issue is that service-entry shells are being used as if they were a stable application RPC layer.

## Architectural Correction

Clash Nivo should separate backend work into two planes.

### 1. Service Lifecycle Plane

Owned responsibilities:

- boot integration
- enable/disable semantics
- `start`
- `stop`
- `restart`
- `reload`
- watchdog registration
- runtime ownership of firewall, dns, and routing
- failed-start rollback

Boundary:

- `/etc/init.d/clashnivo`
- lifecycle helpers under `root/usr/share/clashnivo/service/`

Rules:

- lifecycle stays service-owned and conservative
- lifecycle commands are not generic app jobs
- lifecycle commands should be bounded and orchestrated, not treated like detached page tasks
- lifecycle commands should produce a deterministic result surface for the UI

### 2. Application Job Plane

Owned responsibilities:

- source refresh
- core download / version probe
- package update / version probe
- asset refresh
- dashboard download/update
- config preview / validation if they remain async

Boundary:

- a dedicated command runner under the service tree, but not the `rc.common` wrapper contract itself
- explicit job metadata and log/status paths

Rules:

- jobs are created, tracked, timed out, cancelled, and logged by a dedicated runner
- UI mutations talk to the job runner, not to generic init command shells
- the runner must be able to return immediately without leaving the caller shell responsible for child lifecycle

## Target Command Model

### Lifecycle Commands

Lifecycle commands should remain synchronous from the RPC point of view, even if some internal steps spawn child processes.

Expected behavior:

- `start`
  - validates guard
  - validates active config path
  - orchestrates config generation and core launch
  - returns a bounded structured result
- `stop`
  - unwinds runtime ownership deterministically
  - returns a bounded structured result
- `restart`
  - explicitly sequences stop then start inside the lifecycle layer
  - does not recurse through a second shell dispatch

Lifecycle RPC should not rely on stale request wrappers remaining alive in order to express success.

### Job Commands

Job commands should be managed through a dedicated runner that owns:

- command acceptance
- job ID / metadata
- lock semantics
- log/status files
- timeout
- cancellation
- final state

Expected contract:

- request arrives
- runner validates it
- runner writes/updates job state
- runner spawns the worker in a way that is independent from the LuCI request shell
- request returns structured acceptance immediately

The runner, not the request shell, owns child lifecycle.

## Required Backend Surfaces

The runner should expose a consistent internal surface for each job type:

- `kind`
- `target`
- `accepted`
- `cancelable`
- `started_at`
- `timeout_at`
- `status_path`
- `log_path`
- `final_state`
- `final_message`

This should replace command-specific ad hoc async behavior.

## Migration Strategy

### Phase 1: Introduce a Dedicated Runner Boundary

Add a dedicated service helper for application jobs, for example:

- `root/usr/share/clashnivo/service/job_runner.sh`

Responsibilities:

- start detached jobs safely
- own job metadata updates
- own timeout watchdogs
- own final-state transitions
- never depend on the parent `rc.common` shell staying alive

This phase should not change UI behavior yet. It only changes the backend ownership model.

### Phase 2: Move Maintenance Jobs First

Move the following commands off the direct init-wrapper async pattern first:

- `refresh_source`
- `refresh_sources`
- `update_dashboard`
- `update_assets`
- `update_core`
- `update_package`
- `probe_core_sources`

Reason:

- these are page-driven maintenance jobs
- they benefit from job semantics the most
- they are where wrapper leaks have already been observed repeatedly

### Phase 3: Narrow `rc.common` To Lifecycle And Thin Delegation

After maintenance jobs move:

- `/etc/init.d/clashnivo` should remain only as a lifecycle and compatibility entrypoint
- maintenance commands should delegate immediately into the job runner and return
- the init wrapper should not own async worker lifetime

### Phase 4: Rework Lifecycle RPC Semantics

Once maintenance jobs are moved, revisit lifecycle calls:

- ensure `start` and `restart` are reported through a bounded lifecycle result surface
- remove any remaining places where page-triggered behavior relies on the init shell remaining attached
- keep lifecycle synchronous and explicit

## First Commands To Move

The first concrete migration should move these functions:

- `clashnivo_service_subscription_refresh_command`
- `clashnivo_service_update_dashboard_command`
- `clashnivo_service_update_assets_command`
- `clashnivo_service_update_core_command`
- `clashnivo_service_update_package_command`

These are the commands most often invoked by page interactions and most often implicated in stale wrappers and request hangs.

## Design Rules Going Forward

1. Do not treat `/etc/init.d/clashnivo ...` as the primary async application API.
2. Lifecycle and maintenance jobs are different categories and must not share the same ownership assumptions.
3. The process that answers the LuCI request must not be responsible for the long-running job after acceptance is returned.
4. A background job must always have one clear owner:
   - the dedicated runner
   - not the `rc.common` wrapper
   - not the CGI shell
5. UI state should consume dedicated status/job surfaces, not infer job truth from process wrappers.

## Consequences

Short-term cost:

- another backend refactor
- temporary duplication while compatibility wrappers remain

Long-term gain:

- fewer stale `rc.common` wrappers
- clearer job ownership
- cleaner lifecycle behavior
- less drift between UI state and router truth
- easier support/debugging because failures occur in a purpose-built runner layer instead of an init wrapper side effect

## References

- `docs/architecture/service-lifecycle.md`
- `docs/architecture/service-status.md`
- `docs/architecture/subscription-refresh.md`
- `docs/architecture/update-orchestration.md`
- `docs/decision/service-contract.md`
- `docs/decision/service-ownership.md`
