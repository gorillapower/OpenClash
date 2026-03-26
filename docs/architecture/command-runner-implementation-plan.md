# Command Runner Implementation Plan

Status: Proposed

Issue:
- #133

Epic:
- #140

Informed By:
- [command-runner-and-job-control.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/command-runner-and-job-control.md)
- [rpc-backend-boundary-audit.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/rpc-backend-boundary-audit.md)
- [lifecycle-state-contract-audit.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/lifecycle-state-contract-audit.md)
- [config-generation-and-active-yaml-audit.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/config-generation-and-active-yaml-audit.md)
- [compose-pipeline-reliability-audit.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/compose-pipeline-reliability-audit.md)

## Purpose

Turn `#133` from an architecture intention into an executable implementation plan.

This plan assumes the current shipped baseline remains the source of truth until a coherent replacement slice is ready. It does not authorize more router hot-patch experiments against partial lifecycle changes.

## Current Problem

The backend still mixes three categories of work behind one transport:

1. direct bounded reads and file/UCI mutations
2. service lifecycle orchestration
3. page-driven maintenance jobs

The audits established that the main remaining instability is concentrated in category `2` and `3`, especially where maintenance jobs still enter through `/etc/init.d/clashnivo` and `rc.common`.

## Non-Goals

This refactor does not initially change:

- lifecycle semantics for `start`, `stop`, or `restart`
- config-generation product language
- dashboard UX
- router networking behavior

Those concerns are covered by the linked audits and should only be changed when their contract work is ready.

## Target Split

### Direct Helper / Direct Lua

Keep these on their current direct path:

- `service.status`
- `config.preview`
- `config.validate`
- UCI CRUD
- file read/write
- config inventory and source CRUD
- dashboard inventory and selection
- bounded version reads and refreshes

### Lifecycle Plane

Keep these service-owned for now:

- `service.start`
- `service.stop`
- `service.restart`

They are not part of the first command-runner slice.

### Job Plane

Move these off `rc.common` first:

- `subscription.update`
- `subscription.updateAll`
- `dashboard.update`
- `assets.update`
- `core.probeSources`
- `core.update`
- `package.update`
- paired `updateStatus` calls
- `service.cancelJob`

## First Slice

The first implementation slice should introduce a dedicated job runner without changing the lifecycle plane.

### New Internal Boundary

Add a service helper, for example:

- `root/usr/share/clashnivo/service/job_runner.sh`

The runner owns:

- acceptance
- job kind / target metadata
- lock semantics
- status file path
- log file path
- timeout watchdog
- cancellation
- final state transition

The request shell must not own worker lifetime after acceptance is returned.

### Initial Job Types

Implement the runner for these concrete operations first:

1. subscription refresh
   - one source
   - all sources
2. dashboard update/download
3. assets refresh
4. core source probe
5. core update
6. package update

### Compatibility Strategy

Keep `/etc/init.d/clashnivo` compatibility entrypoints initially, but narrow them:

- each maintenance command should delegate immediately to the runner
- the init wrapper should stop owning the long-lived worker chain
- update-status and cancel-job paths should read/write runner state, not infer truth from wrapper shells

This allows UI and backend callers to transition without a flag day.

## Required Runner Contract

Each accepted job must expose:

- `kind`
- `target`
- `accepted`
- `status`
- `cancelable`
- `started_at`
- `timeout_at`
- `status_path`
- `log_path`
- `final_state`
- `final_message`

Expected status values:

- `idle`
- `accepted`
- `running`
- `succeeded`
- `failed`
- `canceled`
- `timed_out`

Only one active maintenance job should remain allowed at a time in v1 unless there is a clear reason to loosen that later.

## File Ownership Expectations

The runner should reuse the existing runtime prefix and state/log conventions where possible, but make ownership explicit:

- command lock
- per-kind status files
- per-kind logs
- final-state markers

It should stop depending on:

- `rc.common` wrapper lifetime
- CGI stdio inheritance
- shell-parent wait chains as an implicit status surface

## Implementation Order

### Phase 1

Create the runner helper and internal primitives:

- detached spawn
- metadata write
- timeout/watchdog
- finalization
- cancellation

No UI changes in this phase.

### Phase 2

Move subscription refresh and dashboard update first.

Reason:

- they are the most user-visible
- they showed repeated wrapper leaks on real routers
- they are the cleanest proof that the new boundary works

### Phase 3

Move assets, core source probe, core update, and package update.

### Phase 4

Rewrite `updateStatus` and `cancelJob` so they read runner state directly.

At the end of this phase, maintenance jobs should no longer require `rc.common` ownership.

### Phase 5

Only after the job plane is coherent, revisit lifecycle implementation under `#137`.

This is where any later lifecycle/procd work belongs.

## Validation Gates

The first slice is done only when all of these are true:

1. accepted jobs always either start or fail explicitly
2. no stale `/etc/rc.common /etc/init.d/clashnivo ...` wrappers remain after maintenance jobs complete
3. UI polling reads runner-backed status rather than wrapper side effects
4. router testing of source refresh and dashboard update no longer needs manual shell cleanup
5. lifecycle behavior is unchanged by the maintenance-job migration

## Risks

### Hidden Lifecycle Coupling

Some maintenance commands may still assume lifecycle-owned side effects or state files.

Mitigation:

- move jobs in the order above
- keep lifecycle unchanged in the first slice

### Status Drift During Migration

UI polling may briefly consume mixed old/new status surfaces.

Mitigation:

- move `updateStatus` and `cancelJob` as part of the first migration program, not as a later optional cleanup

### Router Validation Noise

Router testing can still be polluted by stale files or prior experimental state.

Mitigation:

- validate only against a clean packaged baseline
- avoid hot-patch experiments for partial lifecycle changes

## Immediate Next Coding Task

The first code slice under `#133` should do only this:

1. add `job_runner.sh`
2. migrate:
   - `subscription.update`
   - `subscription.updateAll`
   - `dashboard.update`
3. migrate:
   - `dashboard.updateStatus`
   - `service.cancelJob`
4. leave lifecycle untouched

That is the smallest slice that meaningfully tests the new ownership model against the worst observed router failures.
