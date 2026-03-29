# Router Validation Checkpoint 2026-03-29

Status: Working checkpoint

Epic:
- #140

Primary issues:
- #133
- #137
- #138
- #139
- #142

## Purpose

Capture the current state after the router lifecycle recovery work finally produced a working service-owned startup path, but before the remaining UI and preview/validate defects are cleaned up and shipped.

This note exists so the next session can start from the current known-good findings instead of reconstructing them from chat history.

## Executive Summary

The backend recovery work made real progress:

- service-owned lifecycle startup is now viable on the router
- the bounded router smoke harness can start Clash Nivo, verify health on `9093`, stop it, and restore OpenClash
- the maintenance/job runner work remains good
- false OpenClash-active detection was fixed

The main remaining blocker is no longer startup itself. The main remaining blocker is a mismatch between:

- the working terminal/init execution path
- and the browser-facing Lua backend RPC execution path

That mismatch is currently visible most clearly in `Preview` / `Validate`.

## What Was Actually Fixed

### 1. Service-owned startup now works

Router validation proved that Clash Nivo can start under a coherent service-owned model.

The critical startup bug was:

- `add_cron()`
- calling `start_watchdog()`
- during the same startup transaction
- which opened another procd instance and broke the core start

Fix:

- move watchdog startup out of the startup transaction
- start it later from the lifecycle finalizer

Result:

- `service_running=true`
- `core_running=true`
- `state="running"`
- controller responds on `9093`

Reference:
- [service-owned-lifecycle-restoration.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/docs/architecture/service-owned-lifecycle-restoration.md)

### 2. OpenClash activity detection was too eager

False `openclash_active=true` states were being triggered by transient OpenClash version probes such as `clash_meta -v`.

Fix:

- tighten guard detection to only treat real `/etc/openclash` runtime processes as active ownership

Result:

- reduced false `blocked`
- reduced false `degraded`
- clearer lifecycle smoke test results

### 3. Maintenance/update jobs were successfully moved off `rc.common` ownership

Already pushed before this checkpoint:

- subscription update jobs
- dashboard update jobs
- assets/core/package update jobs

This work remains valid and is not the current blocker.

## What Is Still Broken

### 1. Browser `Preview` / `Validate` are using the wrong backend execution path

This is the most important current defect.

Confirmed on the router:

- terminal/init path works:
  - `/etc/init.d/clashnivo preview`
  - `/etc/init.d/clashnivo validate`
- browser/LuCI RPC path does not:
  - `backend.preview_config()`
  - `backend.validate_config()`

The Lua backend currently calls:

- `service_json_command("preview")`
- `service_json_command("validate")`

which currently resolve through:

- `init_helper_json("preview")`
- `init_helper_json("validate")`

and `init_helper_json()` does:

- source `/etc/init.d/clashnivo`
- invoke the shell function directly

That is not equivalent to executing:

- `/etc/init.d/clashnivo preview`
- `/etc/init.d/clashnivo validate`

This difference is proven by router output:

- terminal/init path for `EIX.yaml` returns valid generated runtime config
- backend RPC path for the same source returns bad generated runtime values such as:
  - `port: 0`
  - `socks-port: 0`
  - `redir-port: 0`
  - `mixed-port: 0`
  - `mode: ''`
  - `failed_layer: generated_runtime`

This is why the UI preview/validate panel is currently showing broken config even though the terminal/init path succeeds.

### 2. Browser URL hash routing is not reflected in the top-level URL

This is not currently a SPA-nav bug.

The LuCI wrapper still uses an iframe:

- [app.htm](/Users/martinpower/dev/Personal/gorillapowerOpenClash/luci-app-clashnivo/luasrc/view/clashnivo/app.htm)

It embeds:

- `/luci-static/clash-nivo/`

inside a fullscreen iframe.

So route/hash changes occur inside the iframe URL, not the parent browser URL.

Implication:

- `#/compose`
- `#/sources`
- sharable deep links

will not appear in the browser address bar until the iframe integration is changed.

This should be treated under `#142`, not conflated with the preview/validate defect.

### 3. Some UI polish fixes are local only

There is local, unshipped frontend/backend work intended to improve:

- Status page initial loading state
- lifecycle action polling/refetch after Start/Stop/Restart
- disabling repeated action clicks during the lifecycle pulse window
- explicit restart-required notice after changing source while Clash Nivo is running
- stale preview/validate result clearing when the selected source changes
- `config.read` returning `{ content }` so downloads do not show `undefined`
- custom-rules stage short-circuit when custom rules are disabled

These are useful fixes, but they are not committed or shipped yet.

## Current Local Uncommitted Work

The following local files were modified at this checkpoint:

- [.github/ISSUE_TEMPLATE/codex_task.md](/Users/martinpower/dev/Personal/gorillapowerOpenClash/.github/ISSUE_TEMPLATE/codex_task.md)
- [backend.lua](/Users/martinpower/dev/Personal/gorillapowerOpenClash/luci-app-clashnivo/luasrc/clashnivo/backend.lua)
- [clash_nivo_rpc.lua](/Users/martinpower/dev/Personal/gorillapowerOpenClash/luci-app-clashnivo/luasrc/controller/clash_nivo_rpc.lua)
- [composition.sh](/Users/martinpower/dev/Personal/gorillapowerOpenClash/luci-app-clashnivo/root/usr/share/clashnivo/service/composition.sh)
- [preview.sh](/Users/martinpower/dev/Personal/gorillapowerOpenClash/luci-app-clashnivo/root/usr/share/clashnivo/service/preview.sh)
- [Nav.svelte](/Users/martinpower/dev/Personal/gorillapowerOpenClash/luci-app-clashnivo/ui/src/lib/components/Nav.svelte)
- [luci.ts](/Users/martinpower/dev/Personal/gorillapowerOpenClash/luci-app-clashnivo/ui/src/lib/queries/luci.ts)
- [ComposePage.svelte](/Users/martinpower/dev/Personal/gorillapowerOpenClash/luci-app-clashnivo/ui/src/pages/ComposePage.svelte)
- [SourcesPage.svelte](/Users/martinpower/dev/Personal/gorillapowerOpenClash/luci-app-clashnivo/ui/src/pages/SourcesPage.svelte)
- [StatusPage.svelte](/Users/martinpower/dev/Personal/gorillapowerOpenClash/luci-app-clashnivo/ui/src/pages/StatusPage.svelte)
- related test files under:
  - `luci-app-clashnivo/ui/src/test/`
- generated frontend bundle under:
  - `luci-app-clashnivo/ui/dist/`

These changes were deployed to the router for validation, but they are not yet committed.

## Most Important Confirmed Findings

### Finding 1

The service-owned lifecycle model is still the correct direction.

The startup failure was not because procd was fundamentally wrong. The blocking defect was watchdog registration happening inside the startup transaction.

### Finding 2

The current browser `Preview` / `Validate` failure is not primarily a frontend rendering problem.

The UI is showing what the current backend RPC path actually returns.

The real bug is:

- backend preview/validate do not execute through the same path as the working terminal/init commands

### Finding 3

The missing top-level `#/...` route is expected with the current iframe integration.

It should be tracked separately from the preview/validate issue.

## Recommended Next Steps

### Immediate

1. Fix backend preview/validate to execute the real init command and parse its JSON output.
- Do not continue using the direct sourced-function path for these two methods.

2. Validate that the browser now matches the terminal/init result for the active source.
- especially for `EIX.yaml`

3. Commit only the fixes that are actually validated.
- still no version bump until the router-facing flow is solid enough to ship

### After That

1. Decide whether to replace the iframe LuCI integration so top-level hash routing/deep links work again.

2. Finish the UI lifecycle-action polish if it still improves real operator behavior after the preview/validate backend fix is in place.

3. Re-run a short router smoke pass for:
- Start
- Stop
- Preview
- Validate
- source switch while running

## Things We Should Not Re-litigate Next Session

- whether the service-owned lifecycle model is viable on this router
  - it is
- whether `group "nogroup"` is fundamentally the blocker
  - it is not
- whether the current preview/validate UI failure is just stale browser state
  - it is not
- whether the missing top-level URL hash is currently explained
  - it is; the iframe is the reason
