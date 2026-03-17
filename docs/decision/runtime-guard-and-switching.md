# Runtime Guard And Switching

Status: Accepted

Issue:
- #40

## Purpose

Define the runtime guard and switching flow between installed OpenClash and Clash Nivo.

## Decision Summary

Clash Nivo allows installed coexistence with OpenClash but forbids simultaneous runtime ownership.

The runtime guard exists to prevent both products from controlling router networking at the same time.

The product rule is:
- installed together is allowed
- active together is forbidden
- Clash Nivo must refuse runtime start when OpenClash is active
- switching is an explicit handoff, not an implicit race

## Core State Model

The system distinguishes three separate facts:
- whether OpenClash is installed
- whether Clash Nivo is installed
- which product, if any, currently owns runtime networking state

For guard behavior, `active` means a product is currently acting as the owner of router networking. That includes at least:
- enabled or running service state for the product runtime
- active ownership of firewall, DNS, routing, or related transient state that would conflict with the other runtime

Implementation details may evolve, but later code must preserve this distinction:
- installed is not the same as active
- configured is not the same as active
- stale files are not enough to treat a product as active

## Guard Policy

### Clash Nivo Start

`/etc/init.d/clashnivo start` must refuse to proceed when OpenClash is active.

Required behavior:
- detect whether OpenClash is active before taking ownership actions
- fail fast before applying Clash Nivo firewall, DNS, routing, or process ownership
- return a clear machine-readable guard failure through the service contract
- leave Clash Nivo inactive when guard failure occurs

The start path must not attempt to partially start and then discover the conflict later.

### Clash Nivo Restart And Reload

`restart` and `reload` must enforce the same runtime guard as `start` when they would result in Clash Nivo owning active runtime state.

### Clash Nivo Stop

`stop` must clean up only Clash Nivo-owned transient state.

It must not attempt to start OpenClash automatically as part of ordinary stop behavior.

## Installed States And Expected Behavior

### OpenClash Not Installed

Behavior:
- Clash Nivo starts normally if its own prerequisites are satisfied

### OpenClash Installed But Inactive

Behavior:
- Clash Nivo may start normally
- the product may show that OpenClash is installed but inactive
- no import or switch is required just because OpenClash remains installed

### OpenClash Installed And Active

Behavior:
- Clash Nivo start, restart, or runtime-activating reload must refuse
- the user must be told that OpenClash is currently active and must be stopped before Clash Nivo can take ownership
- Clash Nivo must not try to race OpenClash for ownership

### Both Installed And Both Inactive

Behavior:
- either product may be started manually by the user
- whichever starts first becomes the active owner

## Guard Detection Target

Later implementation must produce a reliable `OpenClash active` signal for the service contract and UI.

At minimum, detection should consider:
- OpenClash service enabled/running state
- process/runtime presence for the OpenClash backend
- evidence of current OpenClash-owned transient router state when relevant

Detection should prefer explicit service/runtime evidence over guessing from leftover files.

Detection rules:
- stale config files alone do not mean active
- installed package presence alone does not mean active
- stale temp or log files alone do not mean active

## Service Contract Expectations

When a guard failure occurs, the service surface must allow the UI to distinguish it from generic internal failure.

Required response semantics:
- operation failed because OpenClash is active
- Clash Nivo did not take ownership
- user action needed: stop OpenClash first or use the import/switch flow

The status surface should also expose enough information for the UI to show:
- whether OpenClash is detected as installed
- whether OpenClash is detected as active
- whether Clash Nivo startup is currently blocked by the guard

## User-Facing Messages

The product should use direct, unambiguous messages.

Expected message intent:
- OpenClash is installed but inactive: informational only
- OpenClash is active: Clash Nivo cannot start until OpenClash is stopped
- import from OpenClash requires an ownership handoff before Clash Nivo runtime starts

Messages should avoid implying that simultaneous runtime operation is supported.

## Import Handoff Behavior

Import and switching are related but not identical.

Import may read OpenClash data while OpenClash is present on the system.

However, if the import flow will result in Clash Nivo taking runtime ownership, the handoff must be explicit.

Required import-side behavior:
- detect whether OpenClash is active
- if OpenClash is active, require a controlled stop/handoff before Clash Nivo activation
- allow import of readable upstream data without requiring immediate package removal
- after import, activate Clash Nivo only once the runtime guard condition is clear

Import must not silently leave both runtimes active.

## Manual Switching Flow

The manual switch target flow is:

1. user decides to switch from OpenClash to Clash Nivo
2. if desired, user runs or confirms the built-in import flow
3. OpenClash is stopped and left inactive
4. Clash Nivo validates that the guard is now clear
5. Clash Nivo starts and takes runtime ownership

Rules:
- manual switching is an explicit user action
- stopping OpenClash is part of the handoff
- package removal is optional and not required for the switch to succeed
- OpenClash may remain installed but inactive after the switch

## Automatic Switching Constraints

Clash Nivo must not automatically stop an active OpenClash runtime during an ordinary `start` command without an explicit switching or import action.

Reason:
- ordinary service start must be safe and predictable
- taking down a user's existing live network path without explicit intent is too destructive

If later UI work offers a one-click switch action, that action must be explicit about the handoff it is performing.

## Failure Behavior

If switching or import handoff fails:
- the failure must be reported clearly
- Clash Nivo must not claim successful activation unless it actually owns runtime state
- the system must avoid leaving both runtimes active
- the system should prefer leaving OpenClash active and Clash Nivo inactive over creating an ambiguous dual-owner state

## Manual Guidance Target

The product should be able to guide the user with a simple manual path:
- if OpenClash is active, stop it first
- then start Clash Nivo
- if migrating settings, run import before final activation

The backend and UI should align on this same guidance.

## Non-Goals

This decision does not promise:
- simultaneous runtime operation
- silent automatic migration during any normal start
- automatic reactivation of OpenClash when Clash Nivo stops
- dependency on OpenClash runtime state after handoff

## Notes For Later Phases

This decision sets the implementation target for:
- runtime guard detection logic
- service start failure behavior
- status fields for installed/active/blocking states
- import handoff behavior
- any later UI switch flow
