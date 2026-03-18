# Service Lifecycle

Status: Accepted

Issue:
- #52

Epic:
- #29

## Purpose

Record the service-owned lifecycle sequence for Clash Nivo and the current watchdog ownership model that later network-layer work must preserve.

## Ownership Boundary

Lifecycle orchestration now belongs under:

- `root/usr/share/clashnivo/service/lifecycle.sh`

Runtime entrypoint remains:

- `root/etc/init.d/clashnivo`

Rules:

- `/etc/init.d/clashnivo` stays an rc.common entrypoint
- lifecycle sequencing is delegated to service-owned helpers
- service and watchdog instance names are defined from the service state surface
- later epics may replace internals, but should preserve the sequence contract unless the decision docs change first

## Service-Owned Sequence

Primary helpers:

- `clashnivo_service_run_start`
- `clashnivo_service_run_stop`
- `clashnivo_service_run_restart`
- `clashnivo_service_run_reload`
- `clashnivo_service_run_boot`
- `clashnivo_service_start_watchdog`
- `clashnivo_service_stop_watchdog_instances`

The rc.common entry functions remain as thin wrappers:

- `start_service`
- `stop_service`
- `restart`
- `reload_service`
- `boot`

## Start Contract

Current start sequence:

1. read `clashnivo.config.enable`
2. exit cleanly if the service is disabled
3. no-op if the Clash Nivo service instance is already running
4. require the runtime guard to be clear
5. run the inherited config-generation and core-start sequence
6. install cron state and start the watchdog under Clash Nivo ownership
7. hand off to procd for the core process

Idempotence rule:

- repeated `start` should not create duplicate watchdog instances
- repeated `start` should exit cleanly if the service instance is already running

## Stop Contract

Current stop sequence:

1. back up current runtime group state
2. revert firewall ownership
3. stop the Clash Nivo service instance
4. stop the Clash Nivo watchdog instance
5. revert dnsmasq integration
6. remove cron rules and overwrite state
7. clear disabled-only runtime residue when the service is not enabled

Idempotence rule:

- repeated `stop` must remain safe even if the core or watchdog is already gone
- stop cleanup must target Clash Nivo-owned runtime state only

## Restart Contract

Current restart sequence:

1. record quick-start state
2. run the stop sequence directly
3. run the start sequence directly

Rule:

- restart should not depend on rc.common shell recursion like `stop` then `start` through a second command dispatch
- restart should reuse the same service-owned helpers as explicit start and stop

## Reload Contract

Current reload sequence remains service-owned and centralized.

Rules:

- runtime-activating reload modes must pass the runtime guard first
- reload behavior may still use inherited runtime helpers internally
- later lifecycle work may refine reload internals, but should preserve the same high-level guard behavior

## Watchdog Ownership

Current Clash Nivo watchdog instance name:

- `clashnivo-watchdog`

Rules:

- Clash Nivo starts its own watchdog under `clashnivo-watchdog`
- Clash Nivo stop/restart paths only manage `clashnivo-watchdog`
- OpenClash guard detection still treats `openclash-watchdog` as OpenClash-owned runtime state

## Transitional Notes

Still transitional:

- the watchdog command is still the inherited `openclash_watchdog.sh` helper
- start and stop internals still call inherited runtime helpers for firewall, dns, and config mutation
- log message text still carries inherited OpenClash wording and is tracked separately

## References

- `docs/decision/service-contract.md`
- `docs/decision/service-ownership.md`
- `docs/decision/runtime-guard-and-switching.md`
- `docs/architecture/service-skeleton.md`
- `docs/architecture/service-state.md`
- `docs/architecture/service-status.md`
