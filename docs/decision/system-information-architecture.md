# System Information Architecture

Status: Accepted

Issue:
- #119

## Purpose

Define whether the `System` surface should remain a single page or move to tabs or split workspaces.

This decision exists to prevent ad hoc tab insertion and to make any future structural change explicit before implementation.

## Current State

After the recent maintenance simplification work, `System` now contains three real operator groups:

- runtime and maintenance
- schedules
- advanced router/runtime settings

Logs are no longer part of `System`; they already live in their own top-level workspace.

## Recommendation

Keep `System` as a single page for now.

Do not add tabs yet.

Do not split `Advanced settings` into a separate page yet.

## Why

### 1. The page is long, but not structurally confused enough to justify tabs

The main problem is density and hierarchy, not navigation.

Tabs would hide controls without actually reducing complexity. They would also make the page worse for scanning because operators would have to guess which tab owns a task before they can even see it.

### 2. The current groups are still understandable as one maintenance page

The page currently answers three related questions:

- what runtime and maintenance actions are available
- what is scheduled
- what advanced router behavior is configured

Those still belong to one maintenance-oriented surface.

### 3. Tabs are only justified when the information architecture clearly calls for them

The accepted frontend design rules already allow tabs only when they solve a real IA problem.

That threshold is not met yet.

### 4. Splitting `Advanced settings` is a stronger option than tabs if the page grows again

If `System` becomes too long again, the cleaner move is not `Runtime / Schedules / Advanced` tabs inside one page.

The cleaner move is:

- keep `System` for runtime, maintenance, and schedules
- move `Advanced settings` into its own dedicated workspace

That preserves scanability and keeps the primary maintenance path visible.

## Current Structure Rule

`System` should be organized in this order:

1. `Core runtime`
2. `Auto Updates`
3. `Advanced settings`

Within `Core runtime`, keep related maintenance actions together:

- Clash core status and update
- package update
- asset refresh
- dashboard access

Do not reintroduce a separate `Maintenance summary` surface.

## When Tabs Are Still Wrong

Do not add tabs if the goal is only:

- making the page feel shorter
- hiding advanced controls by default
- avoiding cleanup of redundant copy or weak section hierarchy

Those are layout and editorial problems, not tab problems.

## Trigger For A Future Split

Create a new structural change only if one or more of these become true:

- `Advanced settings` grows enough that routine maintenance actions are pushed too far down the page
- operators repeatedly need advanced controls without needing maintenance controls
- router/runtime settings gain enough internal complexity that they need their own local grouping model
- the page cannot remain readable after hierarchy and copy cleanup alone

If that happens, prefer a dedicated `Advanced` workspace over tabs inside `System`.

## Acceptance Criteria For Any Future Structural Change

Any future `System` restructure must define:

- whether the change is tabs or a dedicated workspace
- which exact sections move
- what the default landing surface is
- how quick access from `Status` and other pages changes
- how the new structure improves scanability more than the current single page

Do not ship tabs or split pages without that explicit scope.
