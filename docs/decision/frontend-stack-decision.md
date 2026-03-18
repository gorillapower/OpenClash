# Frontend Stack Decision

Status: Accepted

Issue:
- #79

## Purpose

Decide the frontend framework, styling approach, and supporting UI/tooling choices for the Clash Nivo frontend.

This decision follows:
- [frontend-product-model.md](./frontend-product-model.md)
- [frontend-information-architecture.md](./frontend-information-architecture.md)
- [frontend-design-system.md](./frontend-design-system.md)
- [frontend-feature-audit.md](./frontend-feature-audit.md)

The goal is not to choose a stack in the abstract.
The goal is to choose the stack that best supports the accepted Clash Nivo product model, current repo reality, and migration cost.

## Current State

The current frontend already has meaningful implementation weight:
- a Svelte 5 SPA
- Vite build tooling
- TanStack Query for data fetching
- Tailwind-based styling
- an existing custom component layer
- Vitest and Playwright already wired into the UI workspace

The current UI also still reflects the pre-reset product model:
- navigation is still `Status / Profiles / Settings / System`
- component structure is more custom than the accepted design system calls for
- several current page and component boundaries are tied to the unfinished earlier IA

This means the decision is not between two greenfield options.
It is between:
- finishing the reset on top of an existing Svelte application
- or paying a deliberate rewrite cost

## Decision

Clash Nivo will keep:
- `Svelte`
- `Vite`
- `@tanstack/svelte-query`
- `Vitest`
- `Playwright`

Clash Nivo will not switch to:
- `Vue`
- `Bootstrap 5` as the primary UI framework

Clash Nivo will keep Tailwind in the repo, but change how it is used:
- Tailwind remains a utility and token layer, not the driver of a large bespoke component system
- native HTML controls should be the default for admin forms and inventory views
- the shared component layer should be reduced and simplified
- custom components should exist only where they meaningfully reduce repeated complexity

## Framework Decision

### Keep Svelte

Svelte remains the chosen framework.

Reason:
- the repo already has a functioning Svelte application structure
- Epic 5 integration can build on that existing base
- the frontend reset is primarily a product and UI architecture reset, not a reactivity-model rescue mission
- replacing the framework now would create a large migration cost without solving the more important design and IA problems directly

This decision does not claim Svelte is universally better than Vue.
It claims that for this repo, at this stage, switching to Vue would be the wrong cost to pay.

### Do Not Switch To Vue

Vue was considered because:
- it may feel more familiar
- its reactivity model may feel more mature in some workflows
- the ecosystem is broader

Vue is rejected for now because:
- the product model, IA, and design system were the real blockers, not the framework alone
- a Vue migration would invalidate a substantial amount of current implementation and test scaffolding
- the current frontend reset can be delivered faster and more cleanly by simplifying the Svelte app than by re-platforming it

If the frontend becomes constrained by Svelte later, that can be revisited as a separate architecture decision.
It is not justified now.

## Styling And Component Decision

### Do Not Adopt Bootstrap 5 As The Primary UI Layer

Bootstrap 5 was considered because:
- it provides many standard admin-oriented primitives out of the box
- it reduces the need to invent basic controls and patterns
- it may feel faster for common form-heavy surfaces

Bootstrap is rejected as the primary UI layer for now because:
- adopting it mid-reset would still require a substantial component and page rewrite
- it would blur the current reset by mixing design-system rework with framework-level migration work
- the accepted design direction is a restrained operator console, not a default Bootstrap admin panel
- the main problem in the current UI is not lack of component availability; it is overly bespoke structure and pre-reset page modeling

### Keep Tailwind, But Narrow Its Role

Tailwind remains acceptable, but its role changes.

Allowed use:
- layout primitives
- spacing
- typography
- color tokens
- state styling
- light utility composition where it keeps markup clear

Discouraged use:
- building large families of bespoke UI primitives without stable product need
- wrapping ordinary form controls just to preserve a local design-system abstraction
- introducing utility-heavy markup where plain semantic HTML plus a small stylesheet would be clearer

The frontend should move toward:
- CSS variables for theme tokens
- restrained utility usage
- small shared components
- more ordinary HTML for settings, tables, and forms

### Shared Component Policy

Going forward, the shared component layer should focus on a small set of durable primitives such as:
- app shell
- navigation
- page header
- status badge
- section shell
- action bar
- confirm dialog
- validation summary
- log viewer

The current `ui/src/lib/components/ui/*` layer should not be treated as sacred.
It should be kept only where it aligns with the accepted design system and repeated product need.

## Testing And Tooling Implications

Keeping the current frontend stack preserves:
- the current Vite build path
- existing Vitest and Playwright setup
- existing TanStack Query usage
- current Svelte-oriented test harnesses

This lowers migration risk for the frontend reset and lets regenerated Epic 5 tickets focus on:
- page restructuring
- UI semantics
- RPC integration
- smoke coverage

No stack-level testing reset is required.

## Migration Cost Assessment

### Option A: Keep Svelte, Simplify Current Stack

Cost:
- lowest

What survives:
- app bootstrap
- data fetching approach
- test tooling
- much of the page/data logic
- existing routing and state patterns

What changes:
- top-level navigation and page structure
- page boundaries
- much of the current component usage
- naming, semantics, and interaction patterns

Assessment:
- recommended

### Option B: Keep Svelte, Adopt Bootstrap 5

Cost:
- medium to high

What survives:
- framework and build tooling
- some page/data logic

What changes:
- most page templates
- most shared UI primitives
- much of the styling strategy
- many frontend tests and selectors

Assessment:
- not justified at this stage

### Option C: Switch To Vue And Rebuild The UI Layer

Cost:
- highest

What changes:
- framework
- component layer
- state/reactivity patterns
- test setup and component tests
- significant amounts of existing UI implementation

Assessment:
- rejected

## Practical Recommendation For Regenerated Epic 5 Work

Epic 5 should be regenerated against this stack decision with these rules:
- keep Svelte
- keep current build/test tooling
- simplify the page model to match the accepted IA
- prefer native controls for admin UI
- reduce or remove custom primitives that do not clearly pay for themselves
- do not adopt Bootstrap as a parallel design system
- do not let Tailwind utility usage grow into another bespoke component framework

## Review Trigger

This decision should be revisited only if one of these becomes true:
- the current Svelte codebase proves unable to express the accepted product model cleanly
- the frontend reset reveals a concrete and repeated limitation caused by the chosen framework
- the component/styling simplification plan fails to produce acceptable implementation velocity

Absent those triggers, the stack decision stands.
