# Frontend Information Architecture

Status: Accepted

Issue:
- #77

## Purpose

Define the Clash Nivo frontend page structure, navigation model, and page ownership boundaries so Epic 5 can be regenerated against a deliberate product IA rather than the current unfinished UI layout.

This document answers:
- what the primary top-level pages are
- what belongs on each page
- what should move, split, or merge from the current UI
- where import, update, maintenance, and advanced functionality live

## Navigation Model

Clash Nivo v1 uses four primary top-level pages:
- Status
- Sources
- Compose
- System

This replaces the current unfinished navigation of:
- Status
- Profiles
- Settings
- System

Reason:
- `Profiles` is too vague for a page that mixes subscriptions, uploaded configs, switching, and raw file editing
- `Settings` is too broad and currently combines composition behavior with router/runtime tuning
- the accepted product model is built around source selection, composition, validation, activation, and maintenance; the IA should reflect that directly

## Top-Level Pages

### 1. Status

Status is the operational homepage.

It answers first:
- is Clash Nivo running
- what source config is selected
- what generated runtime is active
- is the service healthy
- is validation required
- is OpenClash blocking activation
- is there an update or maintenance problem needing attention

Status owns:
- service state
- runtime/core state
- active source and active generated config summary
- compact active customization summary, such as counts of effective custom rules, providers, groups, proxies, and overwrite presence
- guard/blocking state
- recent validation/preview summary
- primary service actions:
  - start
  - stop
  - restart
  - activate valid generated config when appropriate
- first-run empty/setup state

Status does not own:
- detailed source inventory management
- authoring custom composition objects
- full update/settings screens
- raw log browsing beyond short surfaced health signals

Status may deep-link to:
- Sources when no source config exists
- Compose when preview/validation/action is required
- System when maintenance or logs are needed
- a quick log view when the user needs immediate diagnostics

### 2. Sources

Sources owns source inventory and selection.

Sources answers:
- what source configs exist
- where each source came from
- which source is selected
- when each subscription was last refreshed
- whether refresh succeeded

Sources owns:
- subscription list
- uploaded config list
- add subscription
- edit subscription metadata
- delete subscription
- refresh one source
- refresh all sources
- upload config
- delete config
- select active source
- source-level metadata such as refresh interval where supported
- import entrypoint from OpenClash

Sources does not own:
- custom proxies
- custom proxy groups
- custom rules
- overwrite
- router/service runtime tuning
- system/core/package/assets updates

Sources may provide limited source inspection:
- metadata
- last refresh result
- optional read-only source preview

Sources should not position raw YAML editing as the primary product path.
If raw file editing remains supported, it must be secondary and clearly labeled as advanced source editing.

### 3. Compose

Compose owns Clash Nivo-managed customization layers and the preview/validation/activation workflow.

Compose answers:
- what Clash Nivo customizations apply to the selected source
- whether the generated config is valid
- what will be activated
- why composition failed when it fails

Compose owns:
- custom proxies
- rule providers
- custom proxy groups
- custom rules
- overwrite
- scope selection (`all` or selected configs)
- preview generated config
- validate generated config
- activation of a valid generated config
- validation failure details
- layer attribution for preview/validation failures

Compose does not own:
- source inventory management
- runtime start/stop health monitoring as the main focus
- package/core/assets update screens
- full logs/diagnostics as the main focus

Compose structure should be task-first, not implementation-first.
The primary flow is:
1. confirm selected source
2. edit structured Clash Nivo layers
3. preview generated result
4. validate
5. activate

Advanced YAML-oriented escape hatches may exist here, but they are subordinate to the structured model.

### 4. System

System owns maintenance, diagnostics, and router/runtime administration that is not part of the main compose flow.

System answers:
- what version of the package/core/assets is installed
- what maintenance operations are available
- what scheduled behavior is configured
- what logs/diagnostics are available
- what runtime/network settings affect operation

System owns:
- package update status/actions
- core update status/actions
- asset update status/actions
- scheduled source refresh and planned restart behavior where supported
- logs
- diagnostics
- router/runtime tuning that is not source-specific composition
- advanced network/runtime settings
- import reports and migration diagnostics when applicable

System does not own:
- source inventory as the primary task
- structured composition editing as the primary task
- first-run service operations as the primary experience

## Cross-Cutting Placement Rules

### OpenClash Import

OpenClash import entry starts from Sources because import is fundamentally a source and migration action.

Related status and reports may appear in System, but the user should discover import where they manage source inventory, not where they manage package/core updates.

### Preview And Validation

Preview and validation belong to Compose, not Status.

Status may show:
- that the generated config is invalid
- that activation is pending
- that the last validation failed
- a compact summary of what custom layers are currently effective

But the detailed workflow and error resolution live in Compose.

### Activation

Activation belongs operationally to the Compose workflow.

Activation means making the current validated generated config the live runtime config used by Clash Nivo. The backend may perform the required reload or restart internally, but the UI must present activation as a direct product action rather than making the user infer a hidden sequence of save, validate, and restart steps.

Status may expose a limited activation CTA when there is a clearly valid pending generated config, but the canonical place to understand and resolve activation readiness is Compose.

### Scheduling

Scheduling belongs to System.

That includes, where supported:
- scheduled source refresh
- planned restart behavior
- maintenance cadence settings

Scheduling is maintenance policy, not source inventory or composition authoring.

### Logs And Diagnostics

Logs and diagnostics belong to System.

Status may surface concise health or error summaries, and may provide a quick link to logs for immediate troubleshooting, but full logs, detailed diagnostics, and maintenance troubleshooting should not compete with the primary operational and composition flows.

## Current UI: Keep, Split, Move

### StatusPage

Keep as a top-level page, but narrow it to:
- operational state
- high-signal actions
- first-run guidance
- guard/health information

Move out of Status:
- direct subscription creation as a long-term default home
  - keep only a first-run shortcut or empty-state shortcut
- anything that grows into detailed source management

### ProfilesPage

Replace with Sources.

Keep from current page:
- subscription inventory
- config inventory
- source refresh actions
- source selection
- add/edit/delete subscription
- upload/delete config

Move out:
- raw config editing as a primary workflow
  - retain only as advanced source editing if it survives at all

### SettingsPage

Split.

Move composition concerns to Compose:
- custom proxies
- rule providers
- custom proxy groups
- custom rules
- overwrite
- composition-related Clash settings

Move runtime/router administration to System:
- network settings
- router interception/runtime settings
- service/runtime tuning
- maintenance scheduling if present

Do not keep a catch-all `Settings` page in v1 IA.
It is too ambiguous for the product model now accepted.

### SystemPage

Keep as a top-level page, but broaden it.

Keep from current page:
- core update
- logs

Expand to include:
- package update
- asset update
- schedules
- diagnostics
- runtime/network administration
- import reports where useful

## Page Ownership Boundaries

### Status owns state, not configuration editing

If a user is primarily asking `what is happening right now`, they should be on Status.
If they are editing source inventory or composition objects, they should not be on Status.

### Sources owns inventory, not composition

If a user is primarily asking `what source do I have and which one is selected`, they should be on Sources.
If they are authoring Clash Nivo layers, they should be on Compose.

### Compose owns generated behavior, not source inventory

If a user is asking `what will Clash Nivo generate and activate`, they should be on Compose.
If they are managing subscriptions or uploaded files, they should be on Sources.

### System owns maintenance, not the primary happy path

If a user is updating binaries, inspecting logs, adjusting runtime maintenance policy, or tuning advanced router behavior, they should be on System.
System is essential, but should not dominate the main daily operational path.

## v1 Navigation Summary

Top nav for v1:
- Status
- Sources
- Compose
- System

Recommended user progression:
1. Status to understand current state
2. Sources to add/select/refresh source configs
3. Compose to customize, preview, validate, and activate
4. System for maintenance, updates, logs, diagnostics, and advanced runtime settings

## Non-Goals

This IA does not require:
- full visual parity with OpenClash
- preserving inherited page names where they no longer fit the product model
- putting every advanced feature into the top-level nav
- exposing raw backend implementation structure directly in the UI
