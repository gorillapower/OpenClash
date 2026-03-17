# Service Contract

Status: Accepted

Issue:
- #37

## Purpose

Define the v1 Clash Nivo service contract between UI and backend.

## Contract

### Contract Rule

- The UI must interact with the backend through the Clash Nivo service contract, not through ad hoc shell calls, direct filesystem mutation, or assumptions about inherited OpenClash internals.
- The service contract is the stable boundary for:
  - service lifecycle
  - configuration reads and writes
  - config selection and composition
  - logs and diagnostics
  - import entrypoints
- The backend may change implementation details behind this contract as long as the contract remains stable or is versioned intentionally.

### Service Identity

- init service: `/etc/init.d/clashnivo`
- primary runtime identity: `clashnivo`
- primary UCI package: `clashnivo`
- primary RPC endpoint: `/cgi-bin/luci/rpc/clash-nivo`

### Required Service Commands

The service must support these operational commands:

- `start`
- `stop`
- `restart`
- `reload`
- `status`

Expected behavior:

- `start`
  - validates basic prerequisites
  - refuses startup when runtime guard conditions fail
  - starts Clash Nivo-owned runtime only
- `stop`
  - stops Clash Nivo-owned runtime
  - removes Clash Nivo-owned transient router state
- `restart`
  - equivalent to safe stop plus safe start
- `reload`
  - reapplies supported runtime state without requiring the UI to know internal sequencing
- `status`
  - returns machine-readable state sufficient for UI and diagnostics

### Runtime Guard Requirement

- If OpenClash is currently active, `clashnivo start` must fail with a clear reason instead of racing for ownership.
- The UI must be able to surface that guard failure as product behavior, not as an unexplained generic error.
- Guard policy details are defined separately in `runtime-guard-and-switching.md`.

### Configuration Ownership

- The UI may read and write `clashnivo` UCI only.
- The UI must not directly mutate runtime-generated files under `/etc/clashnivo/` except through explicit service-backed operations.
- The backend is responsible for turning user configuration into generated runtime state.

### High-Level UCI Structure

The v1 contract assumes one UCI package, `clashnivo`, with these high-level responsibilities:

- `config`
  - global product settings
  - service enablement
  - active config selection
  - runtime mode and core selection
  - logging and update settings
- `config_subscribe`
  - subscription sources and metadata
- additional sections as needed for v1 product features, including:
  - custom proxy group definitions
  - custom rule definitions
  - import/report state where explicitly modeled

This document freezes the existence of a single `clashnivo` UCI package, not the final field-by-field schema. Detailed composition semantics are defined separately in `config-composition.md`.

### Required RPC Surface

The v1 UI/backend boundary should expose these capability groups through RPC:

- service lifecycle
  - get service status
  - start service
  - stop service
  - restart service
  - reload service where supported
- configuration access
  - read allowed `clashnivo` UCI values
  - write allowed `clashnivo` UCI values
  - add/remove supported UCI sections
  - commit changes
- config file management
  - list available configs
  - set active config
  - delete supported configs
  - trigger config refresh/rebuild where supported
- subscription management
  - add subscription
  - update subscription
  - delete subscription
  - trigger subscription refresh
- logs and diagnostics
  - read service log
  - read core log
  - read validation/report output where available
- import
  - detect importable OpenClash state
  - start built-in import flow
  - read import report/status

### RPC Design Rules

- RPC methods must operate on Clash Nivo-owned state only.
- RPC methods must validate inputs and reject unsafe filesystem paths or arbitrary command injection.
- RPC results should be machine-readable and stable enough for the SPA to consume without scraping shell output.
- RPC errors must be explicit enough for the UI to distinguish:
  - validation failure
  - runtime guard failure
  - missing config
  - unsupported operation
  - internal service failure

### Status And Reporting Contract

The service status surface must provide enough information for the UI to render:

- whether the service is enabled
- whether the service runtime is running
- whether the Clash core process is running
- the active config identity/path
- the selected core/runtime mode where relevant
- whether a guard condition is blocking startup
- whether background operations are in progress, such as:
  - config update
  - core update
  - import

The service may expose additional detail, but the UI must not have to infer these states from logs.

### Log Contract

The service contract must expose at least:

- service log
  - Clash Nivo orchestration and lifecycle output
- core log
  - Clash/Mihomo core output if captured separately

Log access rules:

- the UI reads logs through RPC or another explicit service endpoint
- the UI does not parse log files directly as its primary control plane
- log file paths are implementation details as long as the contract remains stable

### Config Composition Boundary

- The UI provides user intent:
  - selected source config
  - subscriptions
  - custom proxy groups
  - custom rules
  - overwrite inputs
- The backend owns:
  - composition order
  - merge execution
  - generated output
  - validation
  - final runtime activation

This prevents the UI from encoding composition logic that should live in the backend.

### Import Boundary

- Import from OpenClash is part of the Clash Nivo service contract.
- Import is an explicit operation, not background synchronization.
- Import must produce structured status/reporting that the UI can display.
- After import completes, ongoing UI operations must use Clash Nivo-owned state only.

### Non-Goals Of The Contract

The v1 service contract does not guarantee:

- compatibility with OpenClash RPC surfaces
- direct UI access to upstream OpenClash files or UCI
- stability of inherited helper script filenames such as `openclash.sh`
- long-term preservation of current controller implementation details

### Change Control

- Later tickets may implement or refactor internals freely if they preserve this contract.
- If a later ticket needs to change the UI/backend boundary, this decision document must be updated first.

## Notes

- The current repo already exposes parts of this contract through `luasrc/controller/clash_nivo_rpc.lua`, but the current implementation still mixes stable behavior with inherited script names and transitional backend details.
- This decision sets the target contract so later tickets can rewrite internals without re-litigating the UI/backend boundary.
