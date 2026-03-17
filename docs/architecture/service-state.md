# Service State And Logging Surface

Status: Accepted

Issue:
- #49

Epic:
- #29

## Purpose

Define the service-owned runtime state and logging surface that later Epic 2 tickets use for status, runtime guards, and lifecycle cleanup.

This ticket does not redesign every inherited helper script. It establishes the service contract for runtime state paths and provides compatibility aliases so later tickets can move callers without breaking current behavior.

## Service-Owned Runtime State

The service now centralizes its runtime-state path contract in:

- `luci-app-clashnivo/root/usr/share/clashnivo/service/state.sh`

That module initializes the canonical service-owned paths:

- `CLASHNIVO_STATE_DIR=/tmp`
- `CLASHNIVO_RUNTIME_PREFIX=/tmp/clashnivo`
- `CLASHNIVO_TMP_ETC_DIR=/tmp/etc/clashnivo`
- `CLASHNIVO_LOG_FILE=/tmp/clashnivo.log`
- `CLASHNIVO_START_LOG_FILE=/tmp/clashnivo_start.log`
- `CLASHNIVO_CHANGE_FILE=/tmp/clashnivo.change`
- `CLASHNIVO_DEBUG_LOG_FILE=/tmp/clashnivo_debug.log`
- `CLASHNIVO_ANNOUNCEMENT_FILE=/tmp/clashnivo_announcement`
- `CLASHNIVO_LAST_VERSION_FILE=/tmp/clashnivo_last_version`
- `CLASHNIVO_CORE_UPDATE_STATUS_FILE=/tmp/clashnivo_core_update_status`
- `CLASHNIVO_CORE_UPDATE_LOG_FILE=/tmp/clashnivo_core_update_status.log`
- `CLASHNIVO_CORE_LATEST_CACHE_FILE=/tmp/clashnivo_core_latest_version`

## Compatibility Aliases

To avoid a broad rewrite in this ticket, `service/state.sh` also exposes compatibility aliases used by inherited scripts:

- `LOG_FILE`
- `START_LOG`
- `CHANGE_TRACK_FILE`
- `DEBUG_LOG_FILE`
- `ANNOUNCEMENT_FILE`
- `LAST_VERSION_FILE`
- `CORE_UPDATE_STATUS_FILE`
- `CORE_UPDATE_LOG_FILE`
- `CORE_LATEST_CACHE_FILE`

These are transitional compatibility variables. Later tickets should prefer the `CLASHNIVO_*` names for new service-owned logic.

## Current Consumers

Current service-owned consumers for this state surface:

- `service/env.sh`
  - initializes runtime-state variables before the rest of the service environment
- `lib/log.sh`
  - resolves log paths through the service state module when available
- `/etc/init.d/clashnivo`
  - uses centralized state variables for startup change tracking and temp cache placement
- `service/lifecycle.sh`
  - uses centralized cleanup helpers for disabled-state runtime residue removal

## Log Contract

The accepted service log surface remains:

- service log:
  - `/tmp/clashnivo.log`
- startup/status log:
  - `/tmp/clashnivo_start.log`

This ticket makes those paths explicit behind service helpers instead of duplicating them across multiple files.

The broader wording and translation cleanup of `LOG_OUT`/`LOG_TIP`/`LOG_WARN`/`LOG_ERROR` is intentionally deferred to:

- issue `#53`

## Cleanup Rule

When Clash Nivo is disabled and stopped, service cleanup should use the centralized runtime-state helper rather than hardcoding multiple `/tmp/clashnivo*` paths inline.

This currently covers:

- `/tmp/clashnivo_last_version`
- `/tmp/clashnivo.change`
- `/tmp/clashnivo_debug.log`
- `/tmp/clashnivo_announcement`

Additional runtime-state cleanup should be added to the service helper deliberately as later tickets stabilize ownership.

## Why This Matters

- later status work now has one service-owned place to define runtime-state filenames
- later OpenClash runtime-guard work can use the same state surface instead of inventing its own
- log-path handling is explicit and documented
- current scripts keep working while the backend continues to move away from inherited OpenClash internals

## References

- `docs/decision/service-ownership.md`
- `docs/decision/service-contract.md`
- `docs/architecture/service-skeleton.md`
