# Frontend Migration Plan

Status: Accepted

Issue:
- #80

## Purpose

Define how Clash Nivo moves from the current unfinished frontend to the accepted frontend reset without mixing old IA/product semantics into the new UI work.

This document answers:
- what current frontend code is retained
- what must be renamed, split, or replaced
- what becomes explicit transitional debt
- how regenerated Epic 5 work should resume safely

This migration plan follows:
- [frontend-product-model.md](../decision/frontend-product-model.md)
- [frontend-information-architecture.md](../decision/frontend-information-architecture.md)
- [frontend-design-system.md](../decision/frontend-design-system.md)
- [frontend-stack-decision.md](../decision/frontend-stack-decision.md)
- [frontend-feature-audit.md](../decision/frontend-feature-audit.md)

## Migration Position

Clash Nivo will not continue the existing frontend page model in place.

The current frontend is useful implementation material, but it reflects a pre-reset product model:
- navigation is still `Status / Profiles / Settings / System`
- composition and system concerns are still mixed
- action semantics are still closer to inherited OpenClash assumptions than to the accepted Clash Nivo product model
- the shared UI layer is more bespoke than the accepted design system calls for

So the frontend migration should be treated as:
- a controlled restructure on top of the existing Svelte application
- not a pure polish pass
- not a framework rewrite

## What Stays

The following frontend foundations are kept:
- Svelte application bootstrap
- Vite build setup
- TanStack Query usage
- Vitest and Playwright setup
- overall SPA packaging path
- existing LuCI/RPC integration approach

The following code areas are retained as likely implementation bases:
- `ui/src/App.svelte`
- `ui/src/lib/api/*`
- `ui/src/lib/queries/*`
- `ui/src/lib/router.svelte.ts`
- `ui/src/lib/stores/*`
- `ui/src/lib/theme.svelte.ts`
- `ui/src/lib/utils.ts`
- selected layout/navigation shell pieces under `ui/src/lib/components/`

Reason:
- these are infrastructure layers, not the main source of product confusion

## What Changes

The following frontend areas must be reshaped to match the accepted reset:
- top-level navigation
- page boundaries
- action semantics
- shared component policy
- test naming and route expectations
- placement of source, compose, and system functionality

## Route And Page Cutover

### Target Top-Level Routes

The regenerated frontend should expose:
- `/` -> `Status`
- `/sources` -> `Sources`
- `/compose` -> `Compose`
- `/system` -> `System`

During the reset, temporary hash aliases may exist for legacy routes:
- `/profiles` -> `/sources`
- `/settings` -> `/compose`

Those aliases are transitional compatibility only and should be removed once regenerated Epic 5 work no longer depends on them.

### Current-To-Target Mapping

#### StatusPage

Keep and narrow.

Retain as the operational homepage for:
- runtime health
- service state
- guard state
- active source summary
- compact customization summary
- primary service actions
- quick log access

Move out of `StatusPage`:
- long-form source management
- composition authoring
- deep system configuration

#### ProfilesPage

Do not preserve the page as `Profiles`.

Replace with `Sources`.

Keep and adapt:
- subscription inventory
- source refresh actions
- source selection
- subscription CRUD
- uploaded config inventory and deletion

Reframe or demote:
- raw YAML editing
- file-centric editing workflows

#### SettingsPage

Do not preserve as one page.

Split into:
- `Compose`
- `System`

Move to `Compose`:
- custom proxies
- rule providers
- custom proxy groups
- custom rules
- overwrite
- preview / validate / activate workflow

Move to `System`:
- runtime/network/router tuning
- schedules
- logs/diagnostics
- update-related controls

#### SystemPage

Keep as a top-level destination, but broaden and restructure.

Keep and adapt:
- logs viewer
- update surfaces

Add or absorb:
- package update
- core update
- asset update
- schedules
- diagnostics
- advanced runtime/network settings
- dashboard integration entrypoints

## Component Migration Policy

### Keep

Keep or adapt a small number of durable shared surfaces:
- `Layout.svelte`
- `Nav.svelte`
- status and page shell patterns
- log viewer patterns
- a small number of inventory/action primitives if they remain useful after simplification

### Rework

The following should be reworked to fit the accepted IA and design rules:
- `Nav.svelte`
  - replace `Profiles` / `Settings` with `Sources` / `Compose`
- page headers and action bars
- inventory row/card treatment where current components over-emphasize custom styling
- forms and sheets that currently encode old task groupings

### Do Not Treat As Stable

The current bespoke UI primitive layer is not the source of truth for the reset.

That includes:
- `ui/src/lib/components/ui/*`
- deeply wrapped button/input/card abstractions where ordinary HTML would be clearer
- sheets used as the default interaction pattern for workflows that should be page-first

These may survive selectively, but only where they still match:
- the accepted design system
- repeated product need
- a simpler page structure

## Feature Migration By Area

### Status

First-class v1 responsibilities:
- service status
- health and blocked state
- active source and generated runtime summary
- compact customization counts
- start / stop / restart
- quick route into logs and deeper troubleshooting

Lower priority or optional:
- traffic graph

Traffic/throughput visualization may be added later only if it improves operational usefulness without turning the page into a dashboard-heavy surface.

### Sources

Migrate from the current `Profiles` model toward:
- source inventory first
- subscription/upload management first
- import entrypoint
- refresh and select semantics that are explicit

Keep external source operations separate from composition editing.

### Compose

This is the main new page introduced by the reset.

It should absorb the parts of current `Settings` that represent Clash Nivo-owned composition:
- custom proxies
- rule providers
- custom proxy groups
- custom rules
- overwrite
- preview
- validation
- activation

The page should be organized by task flow, not by inherited implementation file or tab naming.

### System

This page becomes the home for:
- package/core/assets update surfaces
- schedules
- logs
- diagnostics
- advanced runtime/network/system settings
- external dashboard launch and related integration settings

Detailed advanced-setting classification is intentionally deferred to:
- [frontend-feature-audit.md](../decision/frontend-feature-audit.md)
- follow-up issue `#82`

## External Dashboard Handling

External dashboards remain a supported capability.

Migration rule:
- keep one supported default path in v1, currently `zashboard`
- preserve launch/access from the main UI
- do not let external dashboards become the primary Clash Nivo experience
- detailed dashboard management can evolve later without blocking the reset

`Nav.svelte` already contains an external dashboard link.
That can survive, but it must be reviewed against the new design system and final System-page model.

## Test Migration Policy

The current UI test setup is retained, but many test expectations are tied to the old IA.

### Keep

Keep as the testing base:
- Vitest unit/component tests
- Playwright smoke/e2e tests
- RPC-mocking approach already present in frontend tests

### Rename Or Rewrite

The following test categories will need direct migration:
- nav tests asserting `Profiles` / `Settings`
- route-rendering tests for `#/profiles` and `#/settings`
- page-specific tests tied to `ProfilesPage` and `SettingsPage`
- e2e flows that assume old tab names or old page boundaries

### New Required Coverage For Regenerated Epic 5

At minimum:
- top-level nav renders `Status / Sources / Compose / System`
- route rendering matches the new IA
- Status empty/setup flow
- Sources refresh/select/import flow
- Compose preview/validate/activate flow
- System update/log entry flow
- external dashboard link presence

## Transitional Debt Rules

During the migration:
- do not ship half-old, half-new page naming if it can be avoided
- do not add new product work to `ProfilesPage`
- do not add new product work to the old combined `SettingsPage`
- if temporary compatibility routes exist, treat them as short-lived and remove them once regenerated Epic 5 lands

The point of the reset is to stop reinforcing the old model.

## Execution Plan For Regenerated Epic 5

Epic 5 should be regenerated against this migration plan instead of resumed from the earlier batch unchanged.

Recommended order:
1. `#83` Navigation Shell And Route Cutover
2. `#84` Status Surface Reset
3. `#85` Sources Surface Reset
4. `#86` Compose Workflow Reset
5. `#47` Core Artifact Source Policy And Abstraction
6. `#87` System Maintenance Surface Baseline
7. `#82` Advanced Settings And Feature Catalogue
8. `#88` System Advanced Settings Integration
9. `#89` UI Reset Cleanup And Smoke Validation

Why this order:
- cut over the app shell first so later UI work is not built on the old `Profiles / Settings` model
- land `Status`, `Sources`, and `Compose` before `System` because those are the primary product surfaces
- insert `#47` before the maintenance/update UI so the core-source policy is settled before update UX is finalized
- insert `#82` between the baseline `System` page and advanced settings implementation so obscure inherited controls are catalogued before they are surfaced
- leave cleanup and smoke validation last so they verify the final reset routes and flows rather than a transitional midpoint

## Acceptance Criteria For Completion

This migration plan is considered complete when later implementation work can answer:
- which current pages survive
- which current pages are renamed, split, or replaced
- which shared components are durable versus transitional
- how tests must move with the reset
- how Epic 5 should be regenerated without reusing the pre-reset IA by accident
