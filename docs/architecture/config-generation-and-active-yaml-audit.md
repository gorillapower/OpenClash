# Config Generation And Active YAML Audit

Status: Proposed

Issue:
- #138

Epic:
- #140

## Purpose

Define the canonical ownership and truth model for Clash Nivo configuration across:

- source YAML inventory
- active source selection
- generated runtime YAML
- controller and dashboard connection settings
- preview and validation outputs
- UI read and edit surfaces

This audit exists because the current product can hold internally inconsistent truths at the same time. The concrete router failures already observed include:

- active runtime/controller listening on `9093` with a dashboard secret
- active YAML on disk still showing `external-controller: 0.0.0.0:9090` and no `secret`
- UI config edit/download surfaces reading source YAML while runtime behavior came from generated runtime state
- dashboard URLs historically pointing at the wrong controller source of truth

## Key Findings

1. Source configs and runtime configs are intentionally different objects.
- source YAMLs live under `/etc/clashnivo/config/`
- generated runtime YAMLs live flat under `/etc/clashnivo/`
- preview and validation outputs live under `/tmp`
- this separation is correct in principle
- the current bug class comes from parts of the product still treating them as if they were interchangeable

2. `config_path` currently points at a source YAML, not a generated runtime YAML.
- RPC `config.list`, `config.read`, `config.write`, and `config.delete` operate only against `/etc/clashnivo/config/<name>.yaml`
- `config_set_active` stores that source path into `clashnivo.config.config_path`
- the composition pipeline then derives generated outputs from that source identity
- this means the active config selected in UCI is really an active source, not the final runtime file

3. The runtime controller contract is sourced from UCI, not from the source YAML file.
- dashboard URLs are generated from:
  - `clashnivo.config.cn_port`
  - `clashnivo.config.dashboard_password`
  - `clashnivo.config.dashboard_forward_ssl`
- the Clash client in the UI also derives controller access from those UCI fields
- this is the right source of truth for controller access
- therefore any active YAML that still contains stale controller settings is not authoritative for the UI

4. Generated runtime YAML can drift from both the source YAML and the UCI controller settings.
- the service contract says the backend owns composition and generated output
- the current implementation still allows stale generated runtime files to remain on disk
- router observations already showed:
  - runtime/controller using UCI-driven `9093` + secret behavior
  - generated/active YAML content still showing `9090`
- this means generated runtime YAML is not being treated as a strictly regenerated artifact

5. The current UI config surfaces blur source editing with runtime truth.
- `config.read` and `config.write` expose source YAML only
- `Compose` preview/validate expose generated preview output separately and correctly
- `Status` and `System` sometimes reason from UCI/controller state
- the user-visible result is confusion about which YAML is the real one when runtime behavior differs from the edited file

## Current Object Model

### 1. Source YAML

Definition:
- preserved user-owned or subscription-owned input YAML

Current path:
- `/etc/clashnivo/config/<name>.yaml`

Current owners:
- RPC:
  - `config.list`
  - `config.read`
  - `config.write`
  - `config.delete`
  - `config.setActive`
- subscription refresh:
  - refresh writes/replaces files in `/etc/clashnivo/config/`

Current meaning:
- this is the selected source input to the composition pipeline
- it is not the final runtime file

### 2. Active Source Pointer

Definition:
- the UCI pointer to the selected source YAML

Current field:
- `clashnivo.config.config_path`

Current meaning in practice:
- selected source path
- despite the field name reading like a final runtime config pointer

Current problem:
- the name `config_path` overstates what this path means
- many failures become harder to reason about because the field sounds like the definitive runtime config file, but it is really the selected source input

### 3. Generated Runtime YAML

Definition:
- the composed runtime artifact used to launch the Clash core

Current path model:
- generated runtime root: `/etc/clashnivo/`
- generated runtime file: `/etc/clashnivo/<name>.yaml`
- temporary working copy: `/tmp/yaml_config_tmp_<name>.yaml`

Current owners:
- service composition pipeline
- lifecycle start path

Current problem:
- generated runtime files are not surfaced clearly enough as a distinct object
- stale generated output can survive while UCI/controller state moves on
- the product lacks an explicit guarantee that generated runtime YAML is always regenerated before startup or after controller-setting changes

### 4. Preview Output

Definition:
- generated but non-activated preview artifact

Current path:
- `/tmp/clashnivo-preview/<name>.yaml`

Current owner:
- `config.preview`
- composition preview pipeline

Current meaning:
- authoritative preview of what the service-owned generation pipeline would produce
- this is the correct surface for "what will actually run" before activation

### 5. Validation Report

Definition:
- structured composition/validation report for the selected source

Current path:
- `/tmp/clashnivo-validation/<name>.yaml.json`

Current owner:
- `config.validate`

### 6. Controller Access Settings

Definition:
- runtime API and dashboard access details

Current UCI fields:
- `clashnivo.config.cn_port`
- `clashnivo.config.dashboard_password`
- `clashnivo.config.dashboard_forward_ssl`

Current owners:
- UCI
- UI dashboard URL decoration
- UI Clash client creation
- service runtime startup

Current meaning:
- these are authoritative for UI access to the running controller
- source YAML and generated runtime YAML should converge to these values, not compete with them

## Current Divergences

### 1. `config_path` Naming Is Misleading

Current behavior:
- field stores the selected source YAML path

Implied behavior from the name:
- field sounds like the final runtime config path

Impact:
- backend and UI code become easier to write incorrectly
- router debugging becomes harder because "active config" can mean two different files depending on which layer is speaking

### 2. Source Editor Is Not A Runtime Editor

Current behavior:
- `config.read` and `config.write` edit source YAML under `/etc/clashnivo/config`

Impact:
- editing a source file does not directly prove what the current running core is using
- if generated runtime YAML is stale, source edit/download surfaces can feel "wrong" even when they are technically reading the intended source object

### 3. Generated Runtime YAML Is Not Enforced As A Fresh Artifact

Observed impact:
- router runtime could use current UCI/controller behavior while the generated file on disk still looked stale

Implication:
- startup and runtime do not currently guarantee regeneration strongly enough, or regeneration is not repairing all controller-related fields before the core is launched

### 4. Dashboard Access Was Historically Bound To The Wrong Truth Source

Past bug:
- dashboard links were inferred without authoritative controller parameters
- this led to links drifting toward stale/generated file state or the wrong controller port

Current corrected direction:
- dashboard URLs are now derived from UCI controller settings

Remaining audit requirement:
- generated runtime YAML must converge to that same UCI truth so the product does not have two competing controller definitions

## Canonical Truth Model

### Canonical Rule 1: Source YAML Is The Editable Input

The UI source editor manages only:
- `/etc/clashnivo/config/<name>.yaml`

That surface should be described as:
- source config
- input config
- selected source

It should not be described as:
- the current live runtime config

### Canonical Rule 2: `config_path` Means Selected Source Path

Current field:
- `clashnivo.config.config_path`

Canonical meaning:
- selected source path

Implication:
- the product should either rename this field in a future schema migration or consistently document it as the selected source pointer
- the UI should stop implying that it directly names the live generated runtime file

### Canonical Rule 3: Generated Runtime YAML Is Service-Owned Output

The generated runtime file under `/etc/clashnivo/<name>.yaml` is:
- not user-edited directly
- not the primary UI editing surface
- the artifact the service owns and should regenerate deterministically

Required behavior:
- lifecycle start must not trust stale generated output when source content or controller settings have changed
- controller settings in the generated runtime file must match authoritative UCI controller settings

### Canonical Rule 4: Preview Output Is The Authoritative "What Will Run" UI Surface

If the product needs to show the user the exact generated result, that surface must come from:
- `config.preview`
- not from re-reading the editable source YAML

### Canonical Rule 5: Controller Access Truth Comes From UCI

The UI should continue deriving controller access from:
- `cn_port`
- `dashboard_password`
- `dashboard_forward_ssl`

The generated runtime YAML must be repaired to match this truth before startup.

## Proposed Product Language

To reduce confusion, the UI and docs should use these terms consistently:

- `Source config`
  - editable YAML under `/etc/clashnivo/config`
- `Selected source`
  - the source path stored in `config_path`
- `Generated config`
  - service-owned runtime output under `/etc/clashnivo/`
- `Preview`
  - generated but non-activated config
- `Running config`
  - current generated runtime artifact in effect for the running core

Avoid calling the source editor simply `Config` when the product also owns a separate generated runtime config.

## Immediate Actions Driven By This Audit

1. Keep controller and dashboard access sourced from UCI.
- do not regress dashboard URLs or Clash client access back to YAML-derived controller settings

2. Make generated runtime YAML regeneration explicit and mandatory before runtime start.
- startup must not rely on stale generated output
- controller-related fields must be refreshed from UCI before launch

3. Treat `config.read` and `config.write` as source-config operations only.
- UI labels and future docs should make that explicit

4. Add a dedicated runtime/generated-config surface only if the product actually needs it.
- do not overload the existing source editor with a second implied responsibility

5. Consider a future schema rename for `config_path`.
- current meaning is selected source path
- future schema should reflect that more honestly

## Relationship To Other Issues

- `#136` explains which methods already moved off `rc.common`
- `#137` defines the lifecycle state contract that will consume these config truths
- `#139` should audit whether preview/validate/start all use the same composition and generation assumptions
- `#133` should eventually make maintenance and lifecycle ownership consistent with this config truth model

## References

- [config-paths.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/config-paths.md)
- [config-composition-boundary.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/config-composition-boundary.md)
- [preview-validation.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/preview-validation.md)
- [rpc-backend-boundary-audit.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/rpc-backend-boundary-audit.md)
- [lifecycle-state-contract-audit.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/lifecycle-state-contract-audit.md)
