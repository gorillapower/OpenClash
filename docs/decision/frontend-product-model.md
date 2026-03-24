# Frontend Product Model

Status: Accepted

Issue:
- #76

## Purpose

Define the Clash Nivo frontend product model against the accepted backend, composition, and runtime-guard contracts.

This document answers a product question before a stack or component question:
- what the user is trying to do
- what must be easy
- what belongs in the main flow versus the advanced flow
- how the UI should behave around status, switching, preview, validation, refresh, and activation

## Product Position

Clash Nivo is a router-side control surface for selecting a source config, composing Clash Nivo-owned customization layers on top of it, validating the result, and activating a generated runtime config safely.

It is not primarily:
- a YAML editor
- a raw log console
- a shell-script front-end
- a compatibility shell around inherited OpenClash behavior

The frontend should therefore optimize for:
- predictable router state
- confidence before activation
- clear ownership and status
- fast common tasks
- explicit advanced workflows when needed

## Primary User

The primary v1 user is an OpenWrt operator who wants to:
- get Clash Nivo running quickly
- understand whether it is healthy and active
- manage one or more source configs and subscriptions
- apply Clash Nivo customizations predictably
- preview and validate before activating changes
- recover quickly from invalid config or runtime conflicts

The primary user is technical enough to understand terms like subscription, proxy group, rule provider, validation, and runtime mode, but should not be forced to understand inherited script internals, raw temporary paths, or backend sequencing.

## Core Product Principles

### Safe By Default

The UI must prefer safe, reversible flows over implicit mutation.

Examples:
- preview before activation
- explicit handoff when OpenClash is active
- clear guard and validation failures
- no silent runtime takeover
- no silent replacement of source content by structured Clash Nivo layers

### Clear Action Semantics

The UI must use direct, consistent action language so the user can predict what a button or form submission will do before clicking it.

Rules:
- labels must describe the actual effect, not an inherited implementation term
- similar operations must use the same verbs across the product
- actions that change stored settings, generated config, runtime activation, or remote refresh must be clearly distinguished
- the UI must not rely on the user inferring behavior from context or legacy OpenClash vocabulary
- the surrounding surface should carry the noun context so action labels can stay short
- feedback must reflect the actual state transition:
  - completed changes should read as saved, deleted, updated, or checked
  - accepted long-running work should read as starting, refreshing, or cancelling
  - busy or blocked work must not be presented as success

Examples of distinctions the product must keep explicit:
- save settings versus preview generated config
- validate generated config versus activate generated config
- refresh source config versus restart Clash Nivo runtime
- switch selected source versus start or stop service

Preferred action vocabulary:
- `Save`
- `Refresh`
- `Activate`
- `Open`
- `Install`
- `Update`
- `Check`
- `Pause`
- `Resume`
- `Clear`

Avoid:
- repeated noun-heavy labels when the section or card already identifies the target
- mixing synonyms for the same effect across pages
- generic `Confirm` labels for destructive actions when `Delete` would be clearer

### Explain Advanced Features In Context

Advanced settings are allowed, but they must not feel like unexplained traps.

Rules:
- advanced settings should be grouped by intent and colocated with related controls
- the UI should use informative labels and tooltips where the feature cannot be made obvious by structure alone
- advanced pages should help the user understand what a setting affects, when it matters, and what the common safe choice is
- documentation should be discoverable from the UI for advanced features that need more explanation than short helper text can provide
- the default path should remain usable without reading long documentation, but advanced behavior must still be explainable when needed

Product guidance:
- prefer tooltip-sized explanation over persistent subtitle text
- use always-visible helper text only when the user must understand a consequence before acting
- remove explanation from the main surface when structure already makes intent obvious


### Generated Runtime, Preserved Source

The frontend must reinforce that users are managing:
- preserved source configs
- Clash Nivo-owned custom layers
- one generated active runtime config

The product should not visually imply that editing a subscription source directly is the primary customization model.

### Simple Primary Flow, Explicit Advanced Flow

Common tasks should feel direct and low-friction.
Advanced capabilities should remain available, but must not dominate the default path.

### Minimal, Functional, Pleasant

The frontend should feel calm, legible, and efficient rather than ornamental.

The visual target is:
- minimal
- functional
- highly usable
- pleasant to use over repeated daily operation

This means later design work should prefer:
- clear hierarchy
- strong readability
- consistent spacing and control behavior
- restrained visual noise
- feedback that is immediate and understandable

### Backend-As-Authority

The UI expresses user intent and renders backend state.
The backend owns:
- composition order
- validation
- activation
- runtime guard decisions
- service lifecycle sequencing

The frontend must not reimplement backend logic in the browser.

## Primary User Journeys

### Journey 1: First-Time Setup

The user wants to get Clash Nivo running with the least possible friction.

Target flow:
1. land on Status
2. see whether Clash Nivo is inactive, healthy, or blocked
3. if no source config exists, add a subscription or upload a config
4. select or confirm the active source
5. preview and validate the generated runtime config
6. activate and start Clash Nivo

Product rule:
- first-run should feel like guided setup, not like opening an advanced admin console
- guidance should be inline and conditional, not a permanent generic checklist panel

### Journey 2: Daily Operation

The user wants to answer:
- is Clash Nivo running
- what config is active
- is traffic flowing through the expected mode/core
- is anything blocked or unhealthy

Target flow:
- Status should answer those questions quickly without making the user navigate through settings or logs first

### Journey 3: Source Management

The user wants to:
- add/edit/delete subscriptions
- upload/delete/select local configs
- refresh source configs
- switch the selected source config

Product rule:
- source management is distinct from customization
- subscriptions and source files are inventory and selection, not the place where Clash Nivo custom layers are authored

### Journey 4: Customize Composition

The user wants to define Clash Nivo-owned behavior on top of the selected source.

That includes:
- custom proxies
- rule providers
- custom proxy groups
- custom rules
- overwrite

Product rule:
- customization must feel structured and predictable first
- advanced YAML-capable escape hatches may exist, but should not define the main experience

### Journey 5: Validate Before Activate

The user wants confidence that the selected source plus current Clash Nivo layers will compose correctly.

Target flow:
- preview generated output
- see whether validation passed or failed
- understand which layer failed
- activate only when the result is valid

Product rule:
- validation is not a hidden implementation detail
- preview/validation is part of the normal product workflow

### Journey 6: Handle Runtime Conflict With OpenClash

The user has OpenClash installed or active.

Target flow:
- UI shows whether OpenClash is installed and whether it is currently blocking Clash Nivo
- if active, the UI explains that Clash Nivo cannot take ownership until OpenClash is stopped
- if migrating, the UI should support explicit import/switch flow without implying simultaneous runtime support

Product rule:
- installed coexistence may be shown as informational
- active coexistence is always an error state for activation

### Journey 7: Maintain The System

The user wants to:
- inspect logs
- view current runtime/core/package/assets state
- run updates
- manage scheduled background behavior such as source refresh or planned restart actions where supported
- diagnose failures

Product rule:
- maintenance exists, but it is secondary to running and composing the product successfully
- maintenance UI should be visually demoted relative to primary runtime and source flows

## Primary Actions Versus Advanced Actions

### Primary Actions

These should be easy, visible, and low-friction:
- view service/runtime status
- understand blocked or unhealthy state
- start, stop, restart
- add a subscription
- upload a config
- select the active source config
- refresh a source config
- preview the generated config
- validate the generated config
- activate a valid generated config
- edit common structured customization inputs
- view the most relevant logs and update state

### Advanced Actions

These should remain available but should not dominate the UI:
- advanced overwrite editing
- raw YAML-oriented customization surfaces
- low-level network tuning beyond common modes
- manual diagnostic/log inspection beyond the primary health view
- detailed asset/package/core maintenance operations
- explicit migration/import workflows
- scheduled source refresh or scheduled restart behavior where supported
- future advanced object-scoping or batch editing tools

### Hidden Or Deferred Internals

These should not be treated as first-class user concepts in v1 unless the backend contract requires it:
- inherited helper script names
- temporary file paths
- implementation-specific runtime file locations
- backend wrapper details
- legacy OpenClash internal names unless needed for migration or guard messaging

## Page Purposes

This document defines purpose, not final IA. Later IA work may still rename, split, or merge pages.

### Status

Status is the operational home page.

Its job is to answer:
- is Clash Nivo active
- is it healthy
- what source/config is active
- what mode/core/runtime state is in effect
- is activation blocked by OpenClash or validation/runtime failure
- what is the next meaningful action

Status should own:
- service lifecycle controls
- active-state summary
- guard and failure messaging
- first-run setup entry when no source exists
- quick links to preview, activation, or fix-up flows when action is required

Status should not become the place for deep configuration editing.

### Profiles

Profiles is the source-config inventory and selection workspace.

Its job is to manage:
- subscriptions
- uploaded configs
- source refresh
- source selection
- source file editing only where explicitly supported

Profiles should make clear:
- which sources exist
- which one is selected
- which sources are subscription-backed versus uploaded
- that source files are preserved inputs, not the full customization model

### Settings

Settings is the customization and product-behavior workspace.

Its job is to manage Clash Nivo-owned inputs and runtime preferences, including:
- common Clash/runtime settings
- router/network settings
- custom proxies
- rule providers
- custom proxy groups
- custom rules
- overwrite
- scope selection where applicable

Settings should distinguish between:
- common structured settings
- advanced customization surfaces

Settings should not require the user to think in terms of source-file mutation.

### System

System is for maintenance, updates, logs, diagnostics, scheduling, and migration support.

Its job is to expose:
- core/package/assets update state and actions
- logs and diagnostics
- scheduled background behavior such as source refresh and planned restart controls where supported
- import/switch support when relevant
- lower-frequency maintenance tasks

System is intentionally secondary to the operational flow.

## Interaction Expectations

### Status

The product should prefer direct, legible state reporting over dashboard noise.

Status should always make it obvious:
- whether the service is running
- whether the core is running
- whether startup is blocked
- whether the current configuration is valid for activation
- what action the user should take next

If the system is blocked, the UI should prioritize:
- why it is blocked
- what the user can do about it

Status should not:
- keep persistent generic `Next steps` panels once the same guidance can be expressed inline
- compete with maintenance surfaces or explanatory filler
- require the user to read repeated subtitles before seeing operational state and controls

### Switching Source Configs

Switching the selected source config is allowed.

Required UX model:
- switching changes the source baseline for the next preview/validation/activation run
- Clash Nivo-owned custom inputs outside the new source's effective scope are ignored for that run
- switching alone should not be treated as an error just because other stored customizations target different configs
- if the resulting effective composition is invalid, preview/validation/activation should show that clearly

The UI must not imply that all stored customizations must apply to all sources at all times.

### Preview

Preview is a core product action.

Required UX model:
- preview shows the generated result of the selected source plus effective Clash Nivo layers
- preview is config-specific and scope-aware
- preview should clearly distinguish source content from Clash Nivo-owned composed output where useful
- preview is for confidence and inspection, not only debugging

### Validation

Validation is a first-class gate, not an afterthought.

Required UX model:
- validation must identify whether the effective composition is usable for activation
- failures must be attributed to a meaningful layer or rule:
  - source
  - normalize
  - custom proxies
  - rule providers
  - custom proxy groups
  - custom rules
  - overwrite
  - final validation
- the UI should help the user fix the failing layer rather than dumping raw backend detail only

### Activation

Activation means making the generated validated runtime config live.

Required UX model:
- activation should be explicit
- activation should operate on the generated config, not on the preserved source file
- activation should be blocked when validation or runtime guard conditions fail
- success should update the status/home view clearly

### Refresh

Source refresh is a source-layer operation only.

Required UX model:
- refresh updates subscription-backed source artifacts
- refresh does not delete Clash Nivo-owned custom layers
- refresh does not silently destroy the last known good source when download fails
- if refresh fails because a subscription URL has expired or become unavailable, the user should be told that the last good materialized source remains intact
- scheduled refresh, where supported, should behave as the automated form of the same source-layer action rather than a separate hidden product model

### OpenClash Guard And Switching

Required UX model:
- OpenClash installed but inactive is informational
- OpenClash active is a blocking state for Clash Nivo activation/start
- normal start must not imply that Clash Nivo will stop OpenClash automatically
- migration/switching, when offered, must be an explicit handoff flow

The UI should use direct language:
- OpenClash is active
- Clash Nivo cannot start until OpenClash is stopped
- import may be performed before final activation

## Error And Feedback Model

The frontend should distinguish these classes of feedback clearly:
- informational state
- validation failure
- runtime guard failure
- refresh/update failure
- internal service failure

The product should avoid collapsing all failures into a generic toast or generic red banner.

At minimum, the user should be able to tell:
- what operation failed
- why it failed at a useful level
- whether the current active runtime was changed
- what action is expected next

Feedback should stay compact on the main surface:
- prefer inline state near the affected object
- do not multiply banners, subtitles, and helper copy for the same event

## Product Simplification Rules

To keep the frontend intuitive, later IA and design work should preserve these rules:
- the main flow is source selection -> preview -> validate -> activate
- structured customization is preferred over raw YAML editing
- advanced inputs are allowed, but should not define the default experience
- source inventory and source customization are related but distinct concerns
- maintenance/update workflows are secondary to operational clarity
- the UI should expose backend state and backend rules, not invent a competing browser-side model
- section hierarchy should reflect task frequency and user value
- selectors, summaries, and actions for the same object should be colocated
- persistent explanatory subtitles should be treated as an exception, not a default pattern


## Feature Scope Review Requirement

Before the regenerated Epic 5 work begins in earnest, the frontend reset must include an explicit review of product feature scope relative to OpenClash and the current unfinished Clash Nivo UI.

That review should classify features into:
- keep
- change
- add
- exclude

The purpose is not to preserve OpenClash parity by default. The purpose is to ensure the frontend intentionally reflects the Clash Nivo product, rather than inheriting feature scope accidentally.

This review should feed the later IA and migration-plan decisions.

## Non-Goals

This product model does not aim to make v1:
- a full visual replacement for every external Clash dashboard feature
- a general-purpose YAML IDE
- a live shell console for inherited backend internals
- a simultaneous dual-runtime manager for OpenClash and Clash Nivo

## Notes For Later Frontend Work

This product model should drive:
- `frontend-information-architecture.md`
- `frontend-design-system.md`
- `frontend-stack-decision.md`
- the regenerated Epic 5 UI tickets

If later UI work needs to contradict this model, update this decision first rather than letting page-level implementation drift redefine the product.
