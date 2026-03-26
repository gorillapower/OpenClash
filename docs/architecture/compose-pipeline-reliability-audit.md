# Compose Pipeline Reliability Audit

Issue:
- #139

## Purpose

Audit whether Clash Nivo's compose-facing operations use one coherent composition
contract across:
- source selection
- preview
- validate
- activate
- lifecycle start

This audit focuses on semantic reliability, not transport reliability. The
transport-side wrapper hangs were narrowed separately in `#136`.

## Audit Basis

This audit was derived from:
- `ui/src/pages/ComposePage.svelte`
- `ui/src/test/compose-page.test.ts`
- `luasrc/clashnivo/backend.lua`
- `luasrc/controller/clash_nivo_rpc.lua`
- `root/usr/share/clashnivo/service/preview.sh`
- `root/usr/share/clashnivo/service/composition.sh`
- `root/usr/share/clashnivo/service/lifecycle.sh`
- `root/etc/init.d/clashnivo`
- existing accepted docs:
  - `docs/architecture/preview-validation.md`
  - `docs/architecture/config-composition-boundary.md`
  - `docs/architecture/config-generation-and-active-yaml-audit.md`
  - `docs/decision/frontend-feature-audit.md`
  - `docs/decision/frontend-explainability-model.md`

## Accepted Product Intent

The accepted product language for `Compose` is:
- `Preview` shows the generated result
- `Validate` checks whether that generated result is acceptable
- `Activate` makes the validated generated config live

That wording appears in the accepted frontend audits and explainability model.

## Current Implementation Shape

### Selected Source

`Compose` reads the currently selected source from `config.list` and allows the
user to switch it via:
- `config.setActive`

That operation updates `clashnivo.config.config_path`, which the config audit now
classifies as the selected source path.

### Preview / Validate Backend Path

`config.preview` and `config.validate` both resolve to:
- `backend.preview_config()` / `backend.validate_config()`
- `service_json_command("preview")` / `service_json_command("validate")`
- init helper entrypoints:
  - `preview()`
  - `validate()`
- service helper:
  - `clashnivo_service_preview_run_pipeline`

In practice, `validate` is not a distinct pipeline. Both commands call the same
pipeline and differ only by the RPC method name that invoked them.

### Compose Pipeline Stages

The preview pipeline currently exposes these ordered stages:
1. `source`
2. `normalize`
3. `custom_proxy_groups`
4. `custom_rules`
5. `overwrite`
6. `validation`

The implementation is:
- source copy into `TMP_CONFIG_FILE`
- normalize via `yml_change.sh`
- custom proxy groups stage is currently a no-op boundary
- custom rules via `yml_rules_change.sh`
- overwrite scripts against `TMP_CONFIG_FILE`
- final YAML parse validation

### Activate Backend Path

The `Compose` page's `Activate` action does not activate a validated generated
artifact.

It currently does this:
- gate button enablement on page-local `validateResult?.valid`
- call `useServiceRestart('clashnivo')`
- `service.restart` triggers the normal lifecycle restart path

So the implementation is:
- `Activate == Restart`

There is no activation RPC that binds a specific preview/validation result to the
subsequent runtime start.

### Start Backend Path

Runtime start performs a broader lifecycle sequence:
1. `check_run_quick`
2. `overwrite_file`
3. `get_config`
4. `config_choose`
5. `do_run_mode`
6. `do_run_file "$RAW_CONFIG_FILE"`
7. if not quick-start:
   - `clashnivo_service_composition_build_generated_config`
8. `start_run_core`
9. cron/watchdog setup
10. `check_core_status`
11. runtime network application

This means start-time composition is embedded in a larger lifecycle path with
preconditions that preview/validate do not execute.

## Key Findings

### 1. `Validate` Is Not Semantically Distinct From `Preview`

Both RPC methods call the same service pipeline.

Current behavior:
- both build a generated working copy
- both run the same stages
- both return preview content and stage results
- both write the same validation report file shape

This is acceptable mechanically, but it means the product distinction is purely
presentational today.

The system does not currently support a separate validation-only pass over an
already-built candidate artifact.

### 2. `Activate` Does Not Activate The Validated Candidate

This is the most important reliability gap.

Current UI semantics imply:
- preview a candidate
- validate that candidate
- activate that candidate

Current implementation actually does:
- preview a candidate under `/tmp/clashnivo-preview/<name>.yaml`
- validate by re-running the same preview pipeline
- restart the service using whatever start-time generation path produces at that
  moment

There is no activation token, no preview fingerprint, and no persisted validated
candidate that the restart path is required to consume.

So the product promise and the implementation are not the same thing.

### 3. Validation Freshness Is Only Tracked In Page-Local Memory

`ComposePage.svelte` stores:
- `previewResult`
- `validateResult`

These are reset only when the selected source changes through the local source
switch flow.

They are not reset when the effective compose inputs change, including:
- custom proxies
- rule providers
- custom rules
- overwrite content
- any future compose-layer UCI changes reflected by the page queries

That means:
- a user can validate once
- then change compose inputs elsewhere on the page
- and still have `Activate` enabled from a stale `validateResult`

This is a real semantic reliability bug.

### 4. Start-Time Preconditions Diverge From Preview / Validate Preconditions

Preview/validate currently do:
- `get_config`
- source copy
- composition stages
- YAML validation

Start currently does much more before and around composition:
- quick-start eligibility checks
- source auto-repair via `config_choose`
- source-download side effects if the selected source is missing but tied to a
  subscription
- runtime/core/assets preparation via `do_run_file`
- quick-start branch that may skip composition entirely

So preview/validate do not currently prove that `start` will succeed, even if the
composition result is valid YAML.

### 5. Quick Start Makes `Activate` Even Less Trustworthy

When quick-start is enabled, lifecycle start can skip composition and reuse the
existing generated runtime file.

Preview/validate always rebuild a candidate in `TMP_CONFIG_FILE` and emit preview
output under `/tmp`.

So the system can currently do all of the following at once:
- preview one generated result
- validate that generated result
- activate via restart
- then start from a previously generated runtime file because quick-start kept
  composition disabled

That is directly at odds with the product promise for `Activate`.

### 6. `custom_proxy_groups` Is Exposed As A Real Stage But Is Still A No-Op Boundary

The composition boundary doc already records this, but it matters for reliability.

Current reality:
- the stage exists in preview/validation output
- the UI presents proxy groups as part of the structured compose pipeline
- the current service composition function returns `0` for that stage and does not
  append custom proxy groups yet

So the pipeline currently overstates what it is actually enforcing.

### 7. Preview / Validate Operate On The Selected Source, Not A Dedicated Draft

This is acceptable for v1, but it should be stated clearly.

Current model:
- selected source path comes from `clashnivo.config.config_path`
- preview/validate derive candidate output from that selected source plus current
  Clash Nivo-owned layers
- there is no separate draft/session object

This means compose reliability depends on deterministic regeneration, not draft
persistence.

## Reliability Implications

The major compose failures are now narrower than they looked before the audits.

They are not primarily about transport anymore. They are about semantic drift:
- stale validation enablement in the UI
- `Activate` not binding to the validated candidate
- start-time quick-start and source-repair branches bypassing preview assumptions
- pipeline stages that are surfaced as meaningful but are not fully implemented

## Canonical Contract Needed

### Rule 1: `Preview` And `Validate` Must Operate On The Same Candidate Model

Accepted.

The current shared pipeline already mostly does this.

### Rule 2: `Activate` Must Mean One Of Two Explicit Things

We need to choose one and enforce it.

Option A: `Activate` means:
- rebuild now from the current selected source and current compose layers
- validate in-band
- make that fresh result live

Option B: `Activate` means:
- make the previously validated candidate live
- require a concrete validated artifact identity/fingerprint

Current implementation is neither cleanly.

Given the current codebase, Option A is the practical v1 contract.

### Rule 3: Any Compose Input Change Must Invalidate Prior Validation State

This includes changes to:
- selected source
- custom proxies
- rule providers
- custom rules
- overwrite content
- any other compose-layer UCI/custom file input

Without that, `Activate` is semantically unsafe.

### Rule 4: Quick Start Must Not Violate Compose Semantics

If `Activate` is kept as a compose action, then either:
- quick-start must be bypassed for activation-driven restarts, or
- quick-start eligibility must incorporate the same compose inputs validated by
  the user, not just the current file-change tracking

### Rule 5: Preview/Validate Must Declare Non-Composition Preconditions They Do Not Cover

They do not currently validate:
- core availability
- runtime startup health
- network/routing ownership
- dashboard/controller reachability
- subscription self-healing in `config_choose`

The product should not imply that a successful preview/validate means the full
runtime start will succeed.

## Recommended Execution Order

### 1. Fix Compose State Freshness In The UI

Immediate follow-up:
- invalidate `previewResult` and `validateResult` whenever compose inputs change
- not only on source switch

This is the fastest reliability win.

### 2. Redefine `Activate` To Mean Fresh In-Band Rebuild + Validate + Restart

Recommended v1 contract:
- `Activate` should run a service-backed operation that:
  1. rebuilds from the selected source and current compose inputs
  2. validates the rebuilt candidate
  3. promotes it to the generated runtime config
  4. restarts or reloads the runtime using that exact rebuilt result

That is materially different from the current `service.restart` shortcut.

### 3. Make Quick Start Compose-Aware

Activation-triggered start must not reuse stale generated output that bypasses the
candidate just previewed/validated.

### 4. Downgrade `custom_proxy_groups` Stage Claims Until Implemented

Until append-only custom proxy-group composition exists:
- the stage can remain in the internal boundary
- but the product should not overstate it as a fully applied composition step

### 5. Add Compose Contract Tests

Coverage should explicitly prove:
- preview and validate operate on the same selected source identity
- input mutations invalidate prior validation state
- activation rebuilds the config from current inputs, not stale preview state
- quick-start cannot cause activation to run stale generated runtime YAML

## Audit Outcome

`#139` confirms that the main remaining compose problem is not transport. It is
contract drift.

The product promise for `Compose` is stronger than the implementation today.

Most importantly:
- `Activate` is not currently "activate the validated generated config"
- it is "restart the service after a previously successful page-local validate"

That gap needs to be closed before the compose surface can be called reliable.
