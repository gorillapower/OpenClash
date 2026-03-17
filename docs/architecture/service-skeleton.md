# Service Skeleton

Status: Accepted

Issue:
- #48

Epic:
- #29

## Purpose

Establish the first real `clashnivo` service boundary so later Epic 2 work can change service behavior without continuing to grow the `/etc/init.d/clashnivo` monolith.

This ticket does not rewrite runtime behavior. It introduces the service-owned module area and moves service entry responsibilities there.

## Service Module Layout

The service skeleton now has a dedicated home under:

- `luci-app-clashnivo/root/usr/share/clashnivo/service/`

Current modules:

- `env.sh`
  - sources shared helper wrappers used by the init script
  - initializes the current service-scoped environment and path variables
- `lifecycle.sh`
  - owns the service entry functions currently exposed through rc.common:
    - `start_service`
    - `stop_service`
    - `restart`
    - `start_watchdog`
    - `reload_service`
    - `boot`

## Boundary Rule

- `/etc/init.d/clashnivo` remains the rc.common entrypoint only.
- Reusable service lifecycle scaffolding should live under `/usr/share/clashnivo/service/`.
- Runtime/network helper internals remain in the existing runtime tree for now.

This creates a stable split:

- init entrypoint
- service lifecycle modules
- runtime helpers
- update helpers

## Transitional State

This is intentionally a first slice, not the full rewrite.

Still transitional:

- service lifecycle modules still call inherited runtime helpers such as `openclash_history_get.sh`, `yml_change.sh`, and `openclash_watchdog.sh`
- environment setup still sources compatibility-wrapper helper names such as `openclash_ps.sh`
- service messages still contain inherited `OpenClash` wording

Those are later Epic 2 and Epic 3 cleanup targets. This ticket only establishes where service-owned logic should now live.

## Why This Split Matters

- later status work can land in the service module area instead of growing the init script
- runtime guard logic now has a clear service-owned home
- lifecycle refactors can happen without mixing rc.common boilerplate with behavior changes

## Rules For Later Tickets

- new service entry or lifecycle logic should go under `/usr/share/clashnivo/service/`
- `/etc/init.d/clashnivo` should stay a thin rc.common entrypoint
- network/runtime implementation still belongs under the runtime helper tree until later epics move or replace it deliberately

## References

- `docs/decision/service-ownership.md`
- `docs/decision/service-contract.md`
- `docs/decision/runtime-guard-and-switching.md`
- `docs/architecture/helper-tree.md`
