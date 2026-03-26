# Service-Owned Lifecycle Restoration

Status: Proposed

Issues:
- #137
- #133

Epic:
- #140

## Purpose

Define the concrete path for restoring a coherent service-owned lifecycle for Clash Nivo after the bounded router investigation established that the current direct-launched core model is the source of the lingering `rc.common stop` wrapper defect.

## Confirmed Problem

The current model mixes:

- `USE_PROCD=1` init semantics
- direct-launched Clash core ownership
- status and guard logic that still expect service-owned truth
- `rc.common stop` paths that manually kill the live direct-launched core

Confirmed router finding:

- minimal `rc.common` and serialized-noop repros exit cleanly
- helper-level stop repros for DNS/firewall/watchdog/state cleanup exit cleanly
- reducing stop to only `clashnivo_service_stop_core_instances` still leaves the outer `/etc/rc.common /etc/init.d/clashnivo stop` wrapper sleeping in `do_wait`

That means the defect is not generic shell behavior. It is the lifecycle ownership mismatch.

## Decision

We will not normalize this by treating `stop` as an accepted async action while leaving the lingering wrapper behavior in place.

We will restore a coherent service-owned lifecycle model for the Clash core.

## Target Model

### Ownership

- procd owns the Clash Nivo core process
- procd owns the Clash Nivo watchdog process
- status derives `service_running` from the procd instance, not a direct-launch compatibility state
- `core_running` remains a runtime health signal, but should normally agree with `service_running`

### Start Sequence

1. acquire lifecycle command lock
2. require the runtime guard to be clear
3. reset transient runtime state
4. run synchronous preflight only:
   - quick-start decision
   - source selection
   - compose/generate runtime config
   - config validation inputs
5. register the Clash core as a procd-owned instance
6. return control so procd can actually spawn the instance
7. run an async start finalizer that:
   - waits for controller health
   - applies runtime network ownership
   - starts cron/watchdog
   - clears `start_failed`
   - logs `started successfully`
8. on healthcheck failure, finalizer must:
   - stop the procd-owned core instance
   - rollback runtime network state
   - mark `start_failed`

### Stop Sequence

1. acquire lifecycle command lock
2. stop the procd-owned watchdog instance
3. stop the procd-owned Clash core instance
4. wait for service/core ownership to clear
5. restore dns/firewall runtime state
6. clear cron/overwrite/runtime residue
7. release the lifecycle lock

Critical rule:
- `stop` must no longer directly kill a live direct-launched core from inside the `rc.common` wrapper path.

## Why The Previous Procd Experiment Failed

The earlier procd swap failed because it tried to keep the old synchronous start contract:

- `start_run_core()` staged the procd instance
- the start path then immediately health-checked `9093`
- but procd only starts the instance after the outer rc.common service message closes

So the healthcheck always ran too early and startup rolled back.

The restoration path therefore requires a split between:

- synchronous preflight/registration
- asynchronous post-start finalization

## First Implementation Slice

### New Internal Boundary

Add a dedicated lifecycle finalizer helper, for example:

- `root/usr/share/clashnivo/service/lifecycle_finalize.sh`

Responsibilities:

- start healthcheck wait loop
- success finalization
- failed-start rollback
- transition logging

### Start Helper Split

Refactor the current start path into:

- `clashnivo_service_prepare_start()`
  - preflight only
- `clashnivo_service_register_core_instance()`
  - procd registration only
- `clashnivo_service_finalize_start_async()`
  - detached finalizer launch only

### Stop Helper Split

Refactor stop into:

- `clashnivo_service_stop_owned_instances()`
  - procd-owned core + watchdog stop
- `clashnivo_service_finalize_stop_cleanup()`
  - dns/firewall/cron/runtime cleanup after ownership is gone

## Validation Gates

This restoration slice is only acceptable when all of these are true on the router:

1. `start` results in:
   - `service_running=true`
   - `core_running=true`
   - `state="running"`
2. `stop` completes without a lingering `/etc/rc.common /etc/init.d/clashnivo stop` wrapper
3. the bounded smoke harness never needs forced recovery for a normal start/stop cycle
4. dashboard gating and blocked/degraded status follow the real runtime state without direct-launch compatibility hacks

## Non-Goals For This Slice

This slice does not reopen:

- maintenance job runner work
- config truth/UI wording cleanup
- router networking / DIRECT path behavior

Those stay under their existing issues.
