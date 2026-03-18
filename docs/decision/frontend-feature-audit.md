# Frontend Feature And Settings Audit

Status: Accepted

Issue:
- #81

## Purpose

Classify the current inherited OpenClash and unfinished Clash Nivo frontend feature surface into:
- keep
- change
- exclude
- add

This audit exists so the frontend reset does not accidentally rebuild OpenClash wholesale and does not silently drop useful operator capabilities.

It is a product-scope decision, not a one-to-one UI implementation plan.

## Audit Basis

This audit was derived from the current repository surface, especially:
- `root/etc/config/clashnivo`
- existing LuCI RPC methods in `luasrc/controller/clash_nivo_rpc.lua`
- current unfinished Svelte pages under `ui/src/pages/`
- inherited runtime/update helpers under `root/usr/share/clashnivo/`

The audit deliberately distinguishes between:
- useful user-facing capability
- inherited implementation detail
- advanced escape hatch
- legacy clutter that should not define Clash Nivo v1

## Outcome Summary

Clash Nivo v1 should keep the useful operator flows from OpenClash, but it should not preserve OpenClash's page structure, button semantics, or raw script exposure as the product model.

The target v1 scope is:
- source inventory and selection
- structured composition
- preview, validation, and activation
- clear runtime status and conflict handling
- package/core/assets updates
- logs and diagnostics
- a reduced, better-grouped advanced settings surface
- supported external dashboard integration

The target v1 scope is not:
- full parity with every inherited OpenClash knob
- raw implementation vocabulary as UI language
- legacy script files as the normal customization workflow

## Keep

### Status And Runtime

Keep:
- service status
- service start/stop/restart
- active source summary
- active generated runtime summary
- OpenClash installed/active blocking state
- core/runtime summary
- quick log access
- compact summary of effective customization layers

Keep as optional secondary signals, not headline features:
- lightweight connection or throughput snapshot
- external IP or current mode summary

Do not turn Status into:
- a source-management page
- a YAML editor
- a dashboard clone

### Sources

Keep:
- subscription add/edit/delete
- subscription refresh one/all
- uploaded config add/delete
- select active source config
- source metadata such as last refresh result
- OpenClash import entrypoint

Keep with reduced prominence:
- read-only source inspection
- raw source download/export

### Compose

Keep as first-class structured capabilities:
- custom proxies
- rule providers
- custom proxy groups
- custom rules
- overwrite as an advanced escape hatch
- preview generated config
- validate generated config
- activate generated config

Keep the accepted composition model from `config-composition.md` as the authority.

### System And Maintenance

Keep:
- package updates
- core updates
- asset updates
- logs viewer
- diagnostics entrypoints
- scheduling for source refresh and planned restart behavior where supported
- advanced runtime/network settings that materially affect operation

### Network And Router Controls

Keep, but move under `System` advanced runtime/network sections:
- operation mode
- stack type
- DNS capture mode
- device access mode (all/blacklist/whitelist)
- router self proxy
- common ports behavior
- IPv6 enable/mode
- QUIC disable
- gateway compatibility
- manual DNS cache flush

These are useful controls, but they are not the main product story.

### External Dashboards

Keep external dashboard access as an important supported capability.

Required v1 direction:
- support one default external dashboard path, currently zashboard
- treat external dashboards as supported integrations, not as the primary Clash Nivo experience
- preserve room to add or manage additional dashboards later

## Change

### Action Semantics

Change all inherited vague or misleading action language.

Examples of required semantic distinction:
- `Save` stores UI-managed settings or objects
- `Preview` builds a candidate generated config
- `Validate` checks the candidate config
- `Activate` makes the validated generated config live
- `Refresh Source` updates remote source material
- `Restart` restarts the Clash Nivo service/runtime
- `Switch Source` changes the selected source config

The frontend must not rely on labels like:
- commit settings
- update config
- switch
- restart

without clear scope and effect.

### Page Structure

Change the inherited page model:
- replace `Profiles` with `Sources`
- split inherited `Settings` into `Compose` and `System`

### Advanced Editing Model

Change these inherited advanced features from primary workflows into explicit advanced tools:
- raw YAML editing
- shell-based overwrite editing
- custom firewall rules editing

They may remain available in v1, but only when clearly labeled advanced and accompanied by warnings or helper text.

### Schedules And Automation

Change scheduling presentation so it is grouped by intent instead of scattered implementation toggles.

Required grouping:
- source refresh schedules
- package/core/assets maintenance schedules if supported
- planned restart behavior where supported

### Update UX

Change update surfaces so the domains are explicit:
- package
- core
- assets

Do not present updates as one ambiguous global action.

### Feature Explanations

Change advanced settings so they are explained in context.

Required direction:
- colocate related settings
- use helper text and tooltips where structure alone is insufficient
- link to deeper documentation where needed

### External Dashboards

Change external dashboard handling so it is framed as supported integration rather than primary product identity.

Required direction:
- keep external dashboard access visible enough to be useful
- do not let dashboard integration displace the main Status, Sources, Compose, and System flows
- keep detailed dashboard management out of primary navigation

## Exclude

### Full OpenClash Parity As A Goal

Exclude any requirement to preserve every inherited OpenClash knob or page concept.

Clash Nivo v1 should not treat the existing inherited surface as the default product contract.

### External Dashboard Management In Primary Navigation

Exclude external dashboard management from the main v1 navigation and primary workflow.

External dashboards are kept as supported integrations, but they should not displace Status, Sources, Compose, or System as the core Clash Nivo product surface.

Detailed dashboard management, if exposed in v1, belongs under advanced `System` integration rather than primary navigation.

### Legacy Source-Mutation Model

Exclude the old mental model where customizations implicitly rewrite or replace source config sections without clear structure.

The frontend must not present:
- source mutation as the primary customization method
- proxy-group replacement as normal behavior
- hidden restart side effects as expected UX

### Raw Script Vocabulary As Product Language

Exclude inherited implementation terminology from primary UI language, including language derived from:
- helper script names
- OpenClash-branded update/downloader internals
- Ruby helper function names
- firewall shell implementation details

### Unknown Advanced Settings By Assumption

Exclude the practice of removing unfamiliar advanced/system settings by assumption.

If a setting is not well understood yet, it must go through deeper catalogue and plain-language evaluation before it is excluded from v1.

## Add

### Feature Classification Discipline

Add an explicit rule for later UI work:
- every inherited feature/settings area must be intentionally classified as keep, change, exclude, or add before it is promoted into the new UI

### Source/Compose/System Separation

Add the product clarity that OpenClash lacked:
- source inventory is one concern
- composition is another
- maintenance/system behavior is another

### Validation-First Workflow

Add first-class UX around:
- preview
- validation
- activation readiness
- failure attribution by layer

This is a core Clash Nivo differentiator, not an implementation detail.

### Better Diagnostics Access

Add explicit quick paths from `Status` to logs and failure details without making logs the main page content.

### Documentation Hooks

Add UI-level documentation affordances for advanced features:
- helper text
- tooltips
- linked docs where short text is insufficient

### Feature Gaps To Fill

The following should be treated as intentional v1 additions or clarifications relative to the inherited surface:
- explicit scope-aware composition UX for custom proxies, providers, groups, and rules
- activation semantics separated from save/refresh/restart semantics
- clear OpenClash blocking and switching UX
- explicit package/core/assets update domains
- compact visibility into which custom layers are currently effective

### Advanced Settings Catalogue

Add a deeper follow-up catalogue for inherited advanced/system settings so later frontend work can classify obscure controls from a complete inventory rather than partial familiarity.

Examples that require catalogue-first treatment:
- GitHub mirror modifier controls
- url-test mirror modifier controls
- dashboard forwarding behavior and related SSL settings
- release-branch style controls
- downloader, transport, or update-path settings whose operational value may be significant in constrained regions or hostile network conditions

## Current Surface: Concrete Calls

### Keep With Redesign

Keep these capabilities, but redesign the UX around them:
- subscription CRUD and refresh
- config file upload/select/delete
- custom proxy groups
- custom proxies
- rule providers
- custom rules
- overwrite
- advanced YAML editing
- custom firewall rules
- logs viewer
- service lifecycle actions
- core/package/assets update actions
- scheduled refresh controls
- router/network advanced controls
- external dashboard access

### Keep As Advanced Only

Keep only as advanced or secondary features:
- raw source YAML editing
- shell overwrite editing
- firewall shell editing
- low-level DNS and runtime tuning that lacks value for most users
- detailed external dashboard management beyond the default supported dashboard path

### Exclude From V1 Default Experience

Exclude these as first-class v1 UI priorities:
- OpenClash vocabulary or page model
- direct exposure of legacy helper-script concepts
- parity-driven recreation of every inherited toggle
- broad low-level implementation knobs without product justification or catalogue review

## Consequences

This audit means the next frontend reset issues should behave as follows:
- `#78` must design around a smaller, clearer feature surface instead of a parity surface
- `#79` must evaluate stack choice against this reduced product model, not against the inherited OpenClash sprawl
- `#80` must classify current UI code by whether it supports the audited target, not by how much work has already gone into it
- a deeper advanced-settings catalogue should be produced before the most obscure system controls are finally kept or excluded
- regenerated Epic 5 tickets should only pull forward features that survive this audit
