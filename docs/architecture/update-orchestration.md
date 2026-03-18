# Update Orchestration

Epic 4 establishes a service-owned update boundary for package, core, and asset updates.

## Service Commands

The init script is the public update contract:

- `/etc/init.d/clashnivo update_status [package|core|assets [target]]`
- `/etc/init.d/clashnivo update_package`
- `/etc/init.d/clashnivo update_package_latest`
- `/etc/init.d/clashnivo update_core`
- `/etc/init.d/clashnivo update_core_latest`
- `/etc/init.d/clashnivo update_assets [all|ipdb|geoip|geosite|geoasn|chnroute]`

## Ownership Boundary

LuCI/backend code must call init-script update commands rather than directly launching legacy update scripts.

The service-owned module keeps explicit status and log surfaces for:

- package update
- core update
- asset update

Status files live under `/tmp/clashnivo*` and are part of the Clash Nivo runtime state contract.

## Transitional Implementation

The current implementation delegates to inherited scripts under `/usr/share/clashnivo/`:

- package update/version
- core update/version
- GEO/IPDB/chnroute asset updates

That delegation is intentional for this ticket. `#63` does not redesign those updater internals. It only centralizes the public orchestration boundary.

## Core Source Policy

This ticket does not decide the core artifact source policy.

The service boundary exposes core latest-version and update commands, but the actual source selection remains delegated to the inherited scripts until follow-up issue `#47` settles:

- `openclash`
- `clashnivo`
- `custom`

## Status Surface

Update status is machine-readable JSON and reports:

- kind
- target
- status
- status path
- log path
- optional message

Normalized status values:

- `idle`
- `accepted`
- `running`
- `done`
- `nochange`
- `error`
