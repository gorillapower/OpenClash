# RPC Backend Boundary Audit

Status: Proposed

Issue:
- #136

Epic:
- #140

## Purpose

Inventory the current LuCI RPC surface and classify each method by its real backend boundary.

This audit exists to answer four concrete questions:

1. Which methods are already direct and bounded?
2. Which methods still depend on `/etc/init.d/clashnivo` and `rc.common`?
3. Which methods belong to lifecycle, direct helper reads, or async maintenance jobs?
4. Which methods have already shown communication-layer failures on real routers?

## Boundary Types

- `direct-lua`
  - handled in Lua/UCI/filesystem directly, without the init wrapper
- `direct-helper`
  - handled by sourcing service helpers directly from Lua
- `lifecycle-via-init`
  - dispatched through `/etc/init.d/clashnivo` as a lifecycle action
- `job-via-init`
  - dispatched through `/etc/init.d/clashnivo` as a maintenance/update command that returns structured JSON

## Key Findings

1. The RPC surface is split across incompatible ownership models.
- `service.status`, `config.preview`, and `config.validate` now bypass `rc.common`.
- `service.start`, `service.stop`, and `service.restart` still rely on `/etc/init.d/clashnivo`.
- maintenance/update commands still rely on `/etc/init.d/clashnivo` even though they behave like application jobs rather than service lifecycle.

2. The current unstable area is concentrated, not universal.
- UCI, file, config inventory, dashboard selection, and subscription CRUD are already `direct-lua`.
- the communication failures observed on routers cluster around:
  - lifecycle methods
  - status methods before the direct-helper fix
  - compose methods before the direct-helper fix
  - maintenance/update commands that still use init-wrapper transport

3. The next architectural move remains unchanged.
- keep lifecycle service-owned
- keep read operations bounded and direct
- move maintenance jobs to a dedicated runner instead of treating `rc.common` as an async RPC bus

## Method Inventory

| Method | Primary UI Surface | Current Boundary | Current Backend Path | Known Communication Failure Mode | Intended Boundary |
| --- | --- | --- | --- | --- | --- |
| `uci.get` | all pages | `direct-lua` | controller -> UCI cursor | none identified | keep `direct-lua` |
| `uci.set` | settings/system/logs | `direct-lua` | controller -> UCI cursor | none identified | keep `direct-lua` |
| `uci.add` | settings editors | `direct-lua` | controller -> UCI cursor | none identified | keep `direct-lua` |
| `uci.delete` | settings editors | `direct-lua` | controller -> UCI cursor | none identified | keep `direct-lua` |
| `uci.commit` | all settings flows | `direct-lua` | controller -> UCI cursor | none identified | keep `direct-lua` |
| `service.status` | Status, Sources, Compose, System | `direct-helper` | controller -> `backend.service_status()` -> `service_helper_json("clashnivo_service_status_json")` | previously hung through `status_json` init wrappers; still vulnerable to split-brain state because lifecycle ownership is inconsistent | keep `direct-helper`, reconcile with `#137` |
| `service.start` | Status | `lifecycle-via-init` | controller -> `backend.service_action("start", true)` -> `/etc/init.d/clashnivo start` | stale/no-op UI behavior when lifecycle ownership diverges from core ownership | keep lifecycle-owned, redesign under `#137` / `#133` |
| `service.stop` | Status | `lifecycle-via-init` | controller -> `backend.service_action("stop")` -> `/etc/init.d/clashnivo stop` | stop can hang or fail to unwind when lifecycle plane is inconsistent | keep lifecycle-owned, redesign under `#137` / `#133` |
| `service.restart` | Status | `lifecycle-via-init` | controller -> `backend.service_action("restart", true)` -> `/etc/init.d/clashnivo restart` | async restart hides failure state; previously observed state drift after refresh-triggered restart | keep lifecycle-owned, redesign under `#137` / `#133` |
| `service.cancelJob` | Status/System | `job-via-init` | controller -> `backend.cancel_active_job()` -> `/etc/init.d/clashnivo cancel_job` | depends on the same command-lock/job path as maintenance commands | move to dedicated job runner |
| `file.read` | config editor, diagnostics | `direct-lua` | controller -> allow-listed file read | none identified | keep `direct-lua` |
| `file.write` | config editor | `direct-lua` | controller -> allow-listed file write | none identified | keep `direct-lua` |
| `log.service` | Logs | `direct-lua` | controller -> `tail_file()` | UI staleness was not transport failure; file read itself is bounded | keep `direct-lua` |
| `log.core` | Logs | `direct-lua` | controller -> `tail_file()` | same as above | keep `direct-lua` |
| `log.updates` | Logs | `direct-lua` | controller -> `tail_file()` | obsolete as a separate product surface after log consolidation | likely retire or alias |
| `log.clear` | Logs | `direct-lua` | controller -> allow-listed file truncate | none identified | keep `direct-lua` |
| `system.info` | legacy/system | `direct-lua` | controller -> UCI + direct version read | none identified; feature overlap with newer queries | keep or retire after audit |
| `subscription.add` | Status, Sources | `direct-lua` | controller -> UCI create section | duplicate semantics changed over time; transport itself is bounded | keep `direct-lua` |
| `subscription.test` | Status, Sources | `direct-lua` | controller -> `backend.subscription_preflight()` -> direct curl probe | router upgrades previously hid method due to stale LuCI module cache, not method transport | keep `direct-lua`; keep install cache invalidation coverage |
| `subscription.list` | Sources, Status | `direct-lua` | controller -> UCI foreach | none identified | keep `direct-lua` |
| `subscription.delete` | Sources | `direct-lua` | controller -> UCI delete | state drift used to persist until config reconciliation fixes | keep `direct-lua` |
| `subscription.edit` | Sources | `direct-lua` | controller -> UCI update + optional YAML rename | no transport failure; state consistency belongs to `#138` | keep `direct-lua` |
| `subscription.update` | Status, Sources | `job-via-init` | controller -> `backend.start_subscription_update(name)` -> `/etc/init.d/clashnivo refresh_source <name>` | repeated accepted-but-not-started jobs, stale wrapper shells in `do_wait`, UI hangs | move to dedicated job runner |
| `subscription.updateAll` | Sources | `job-via-init` | controller -> `backend.start_subscription_update()` -> `/etc/init.d/clashnivo refresh_sources` | same as above | move to dedicated job runner |
| `config.list` | Sources, Compose, Settings | `direct-lua` | controller -> filesystem inventory + UCI active path | none identified | keep `direct-lua` |
| `config.setActive` | Sources, Settings | `direct-lua` | controller -> UCI `config_path` update | no transport failure; correctness belongs to `#138` | keep `direct-lua` |
| `config.delete` | Sources, Settings | `direct-lua` | controller -> filesystem delete + active path repair | no transport failure; correctness belongs to `#138` | keep `direct-lua` |
| `config.read` | Sources, Compose, Settings | `direct-lua` | controller -> `file.read` delegate | user reported stale/empty content in UI despite non-empty files on disk; likely cache/state issue, not transport | keep `direct-lua`, audit with `#138` |
| `config.write` | Sources, Settings | `direct-lua` | controller -> `file.write` delegate | none identified | keep `direct-lua` |
| `config.preview` | Compose | `direct-helper` | controller -> `backend.preview_config()` -> `service_json_command("preview")` -> direct helper call | previously hung through init wrapper; now returns bounded composition failure payloads | keep `direct-helper`, audit semantics with `#139` |
| `config.validate` | Compose | `direct-helper` | controller -> `backend.validate_config()` -> `service_json_command("validate")` -> direct helper call | previously hung through init wrapper; now returns bounded composition failure payloads | keep `direct-helper`, audit semantics with `#139` |
| `core.latestVersion` | Status, System | `direct-lua` | controller -> cached file read | none identified | keep `direct-lua` |
| `core.current` | Status, System | `direct-lua` | controller -> direct file/version read | installed-core detection drift was correctness, not transport | keep `direct-lua` |
| `core.refreshLatestVersion` | Status, System | `direct-lua` | controller -> direct version script invocation | none identified | keep `direct-lua` |
| `core.probeSources` | Status, System | `job-via-init` | controller -> `backend.probe_core_sources()` -> `/etc/init.d/clashnivo probe_core_sources` | still uses init wrapper despite being a bounded maintenance probe | move to dedicated job runner or direct helper |
| `core.update` | Status, System | `job-via-init` | controller -> `backend.start_core_update()` -> `/etc/init.d/clashnivo update_core` | accepted/busy semantics depend on init-wrapper command path; hangs observed in earlier job transport debugging | move to dedicated job runner |
| `core.updateStatus` | Status, System | `job-via-init` | controller -> `backend.update_command("update_status", "core")` -> `/etc/init.d/clashnivo update_status core` | still depends on init-wrapper status for job polling | move to dedicated job runner |
| `package.latestVersion` | System | `direct-lua` | controller -> cached file read | none identified | keep `direct-lua` |
| `package.refreshLatestVersion` | System | `direct-lua` | controller -> direct version script invocation | none identified | keep `direct-lua` |
| `package.update` | System | `job-via-init` | controller -> `backend.start_package_update()` -> `/etc/init.d/clashnivo update_package` | same maintenance job ownership problem as core/subscription jobs | move to dedicated job runner |
| `package.updateStatus` | System | `job-via-init` | controller -> `backend.update_command("update_status", "package")` -> `/etc/init.d/clashnivo update_status package` | same as above | move to dedicated job runner |
| `assets.update` | System | `job-via-init` | controller -> `backend.start_assets_update(target)` -> `/etc/init.d/clashnivo update_assets <target>` | same maintenance job ownership problem as core/subscription jobs | move to dedicated job runner |
| `assets.updateStatus` | System | `job-via-init` | controller -> `backend.update_command("update_status", "assets", target)` -> `/etc/init.d/clashnivo update_status assets <target>` | same as above | move to dedicated job runner |
| `dashboard.list` | System | `direct-lua` | controller -> `backend.dashboard_list()` + URL decoration | no transport failure; link visibility depends on lifecycle status contract | keep `direct-lua` |
| `dashboard.select` | System | `direct-lua` | controller -> UCI update | none identified | keep `direct-lua` |
| `dashboard.update` | System | `job-via-init` | controller -> `backend.dashboard_update(id)` -> `/etc/init.d/clashnivo update_dashboard <id>` | observed hangs and stuck wrappers during dashboard download/update | move to dedicated job runner |
| `dashboard.updateStatus` | System | `job-via-init` | controller -> `backend.update_command("update_status", "dashboard", id)` -> `/etc/init.d/clashnivo update_status dashboard <id>` | same as above | move to dedicated job runner |

## Current Boundary Summary

### Already On The Right Side Of The Boundary

- UCI CRUD
- file read/write
- log read/clear
- subscription CRUD and preflight
- config inventory and file CRUD
- dashboard inventory and selection
- cached version reads
- direct version refresh scripts
- direct-helper status
- direct-helper preview/validate

### Still On The Wrong Side Of The Boundary

- lifecycle commands:
  - `service.start`
  - `service.stop`
  - `service.restart`
- maintenance/job commands:
  - `service.cancelJob`
  - `subscription.update`
  - `subscription.updateAll`
  - `core.probeSources`
  - `core.update`
  - `core.updateStatus`
  - `package.update`
  - `package.updateStatus`
  - `assets.update`
  - `assets.updateStatus`
  - `dashboard.update`
  - `dashboard.updateStatus`

## Immediate Actions Driven By This Audit

1. Keep `service.status`, `config.preview`, and `config.validate` on the direct-helper path.
- do not regress them back through `/etc/init.d/clashnivo`

2. Treat lifecycle and maintenance separately.
- lifecycle belongs in `#137`
- maintenance/job transport belongs in `#133`

3. Move maintenance jobs off `rc.common` first.
- the first migration set remains:
  - subscription refresh
  - dashboard update
  - assets update
  - core update
  - package update
  - core source probe

4. Do not use this audit to justify more UI work yet.
- the remaining failures are backend-boundary and lifecycle-contract problems, not page-layout problems

## References

- [service-contract.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/decision/service-contract.md)
- [command-runner-and-job-control.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/command-runner-and-job-control.md)
- [service-status.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/service-status.md)
