# OpenClash Legacy Reference Audit

Status: Accepted

Issue:
- #101

## Purpose

Classify the remaining `openclash` and `OpenClash` references in the Clash Nivo repo so cleanup work can target real coexistence and runtime risks first instead of treating every legacy string as equally urgent.

## Why This Audit Exists

Earlier epics correctly defined the target architecture:

- Clash Nivo runtime ownership is fully `clashnivo` namespaced.
- Installed coexistence with OpenClash is allowed.
- Active runtime ownership by both products at the same time is not allowed.

However, the earlier validation passes were intentionally narrower than the final coexistence problem:

- Epic 1 validation excluded `root/etc/init.d/` and inherited helper internals.
- package lifecycle safety was not validated semantically, only through narrower namespace/boundary checks
- real router install/uninstall validation was deferred to later hardening work

This audit closes that gap by separating:

1. active behavioral risk
2. packaging/install risk
3. runtime naming debt
4. docs/comments only

## Classification Rules

### Category A: Active Behavioral Risk

A reference is Category A if it can still affect router behavior, runtime ownership, generated config behavior, or coexistence with an installed OpenClash instance.

Examples:

- a script reads or writes OpenClash-owned runtime state during normal Clash Nivo operation
- Clash Nivo firewall comments or chain names still use `OpenClash`
- normal service/update/composition paths still depend on inherited `openclash_*` entrypoints
- install defaults mutate shared system files in ways that are still coupled to inherited helpers

### Category B: Packaging Or Install Risk

A reference is Category B if it affects package build, install, uninstall, upgrade, or release artifact correctness.

Examples:

- uninstall hooks deleting upstream-owned files
- install defaults mutating shared system configuration
- workflow packaging and release steps using stale or misleading legacy paths/names

### Category C: Runtime Naming Debt

A reference is Category C if it is still live code, but currently represents naming or wrapper debt rather than immediate coexistence breakage.

Examples:

- wrapper scripts like `/usr/share/clashnivo/openclash_update.sh`
- inherited helper filenames under `root/usr/share/clashnivo/`
- log strings that still say `OpenClash` while operating only on Clash Nivo-owned state

These still matter because they obscure ownership, weaken future audits, and make real-router debugging harder.

### Category D: Docs, Migration, Or Intentional Product References

A reference is Category D if it documents:

- coexistence policy
- import behavior
- migration from OpenClash
- historical notes or upstream relationship

These references are intentional and should not be removed blindly.

## Current Findings

### Category A: Active Behavioral Risk

#### 1. Init Script Firewall Comments And Rule Labels

File:
- `luci-app-clashnivo/root/etc/init.d/clashnivo`

Examples:
- comments such as `OpenClash DNS Hijack`
- comments such as `OpenClash QUIC REJECT`
- comments such as `OpenClash TUN Forward`
- one inherited chain reference `openclash_mangle_output`

Why this is risky:
- these rules are live router state, not just comments
- ownership tracing becomes ambiguous during coexistence debugging
- any remaining inherited chain-name dependency can break the accepted ownership model

Required follow-up:
- rename comments to `Clash Nivo ...`
- eliminate remaining inherited chain references in active firewall/routing paths
- validate runtime rules on a router after cleanup

#### 2. Shared-System Mutation In Install Defaults

File:
- `luci-app-clashnivo/root/etc/uci-defaults/luci-clashnivo`

Current active mutation:
- patching `/usr/lib/lua/luci/model/network.lua`

Why this is risky:
- this is a shared system file outside Clash Nivo-owned state
- the patch exists to support inherited helper behavior through `openclash_get_network.lua`
- upgrade/uninstall boundaries are harder to reason about while this patch remains

Current judgment:
- still active technical debt
- not safe to remove blindly because inherited network helper logic still depends on it

Required follow-up:
- isolate WAN/network discovery behind Clash Nivo-owned helpers that do not patch LuCI core files
- remove the `network.lua` patch after replacement

#### 3. Normal Runtime And Update Paths Still Depend On Inherited Entry Points

Files:
- `luci-app-clashnivo/root/usr/share/clashnivo/service/env.sh`
- `luci-app-clashnivo/root/usr/share/clashnivo/service/lifecycle.sh`
- `luci-app-clashnivo/root/usr/share/clashnivo/service/update.sh`
- `luci-app-clashnivo/root/usr/share/clashnivo/service/composition.sh`

Examples:
- sourcing `openclash_ps.sh`
- watchdog command still points at `openclash_watchdog.sh`
- update paths still point at `openclash_update.sh`, `openclash_core.sh`, `openclash_geoip.sh`, and related scripts
- composition overwrite path still uses `openclash_custom_overwrite.sh` and `/tmp/yaml_openclash_*`

Why this is risky:
- these are not harmless filenames in dead code
- they are still the live internal execution path for normal operation
- they keep active behavior entangled with inherited names and temp artifacts

Current judgment:
- coexistence bug severity is lower than direct writes into `/etc/config/openclash`, but still active runtime debt
- this is the next major cleanup layer after install/uninstall safety

Required follow-up:
- introduce Clash Nivo-owned helper names and move service modules to them
- keep temporary compatibility wrappers only where needed
- rename temporary files produced by composition/overwrite flow

### Category B: Packaging Or Install Risk

#### 1. Package Lifecycle Overlap

File:
- `luci-app-clashnivo/Makefile`

Status:
- fixed in commit `b64a5e45`

What was fixed:
- uninstall no longer deletes OpenClash-owned config/state
- uninstall no longer reverts shared LuCI HTTP settings

Why it still belongs in this audit:
- this was the concrete real-router failure that exposed the gap between namespace validation and lifecycle safety
- future package changes must be judged against ownership, not just string matching

#### 2. CI Packaging Could Ship Stale UI

File:
- `.github/workflows/compile_new_ipk.yml`

Status:
- fixed in commit `b64a5e45`

What was fixed:
- CI now runs `npm ci` and `npm run build` before packaging `ui/dist`

Remaining debt:
- post-process still rewrites release README lines with `OpenClash` strings

Judgment:
- naming debt only in the post-process README rewrite
- no longer a blocker for building a current Clash Nivo UI package

### Category C: Runtime Naming Debt

#### 1. Wrapper And Helper Filenames

Examples under:
- `luci-app-clashnivo/root/usr/share/clashnivo/`
- `luci-app-clashnivo/root/usr/share/clashnivo/runtime/`
- `luci-app-clashnivo/root/usr/share/clashnivo/update/`
- `luci-app-clashnivo/root/usr/share/clashnivo/lib/`

Representative files:
- `openclash.sh`
- `openclash_watchdog.sh`
- `openclash_update.sh`
- `openclash_core.sh`
- `openclash_geoip.sh`
- `openclash_get_network.lua`
- `openclash_streaming_unlock.lua`

Why this matters:
- active ownership remains harder to audit
- service code still reads like inherited OpenClash internals
- future grep-based validators produce too much mixed noise

Judgment:
- important, but secondary to Category A behavioral cleanup

#### 2. Runtime Log Strings

Examples:
- `OpenClash Start Running...`
- `OpenClash Already Stop!`
- `OpenClash update failed...`

Why this matters:
- logs are the primary debugging surface on real routers
- wrong product naming makes coexistence and support analysis harder

Judgment:
- cleanup should follow helper-path cleanup so messages and code boundaries move together

#### 3. Custom File Naming Carryover

Examples:
- `/etc/clashnivo/custom/openclash_custom_overwrite.sh`
- `/etc/clashnivo/custom/openclash_custom_chnroute_pass.list`
- `/etc/clashnivo/custom/openclash_custom_localnetwork_ipv4.list`

Why this matters:
- these files are now stored under Clash Nivo-owned directories, but still use inherited names
- they increase confusion about product ownership and migration semantics

Judgment:
- runtime naming debt
- needs a migration/compatibility plan so existing installs do not break

### Category D: Docs, Migration, Or Intentional Product References

Examples:
- `docs/decision/product-boundary.md`
- `docs/decision/runtime-guard-and-switching.md`
- `docs/decision/openclash-import-scope.md`
- `docs/testing-strategy.md`

Why these are not cleanup targets:
- they intentionally describe coexistence, migration, or import behavior
- removing those references would damage product clarity rather than improve ownership

## What Is Already Considered Acceptable

The following OpenClash references are still valid by design:

- runtime guard detection of installed/active OpenClash
- product docs describing coexistence and migration
- import-scope docs and issues
- source-policy options where `core_source=openclash` is an explicit product choice

These are not evidence of accidental coupling by themselves.

## Cleanup Order

### Batch 1: Active Runtime Ownership Cleanup

Target:
- eliminate Category A runtime/comment/chain debt in live router paths

Priority work:
- `init.d/clashnivo`
- `service/lifecycle.sh`
- `service/update.sh`
- `service/composition.sh`
- watchdog/runtime helpers they invoke

### Batch 2: Shared-System Mutation Removal

Target:
- remove the `network.lua` patch dependency

Priority work:
- replace `openclash_get_network.lua` and related callers with Clash Nivo-owned discovery helpers
- delete the `uci-defaults` patch once replacement is proven

### Batch 3: Helper And Wrapper Rename Plan

Target:
- reduce Category C wrapper and helper debt without breaking compatibility

Priority work:
- introduce `clashnivo_*` helper entrypoints
- migrate service modules to the new names
- leave thin compatibility wrappers only where required during transition

### Batch 4: Log And Comment Cleanup

Target:
- make runtime/debug/update output consistently say `Clash Nivo`

### Batch 5: Docs And Workflow Naming Polish

Target:
- clean residual release/workflow naming once the live code paths are already correct

## Verification Standard For Follow-Up Work

Future cleanup issues under this audit should verify more than grep results.

Minimum expected checks:

- `sh -n` / `bash -n` for touched shell files
- targeted grep checks for changed paths
- real-path review of package lifecycle hooks
- router validation for any change touching:
  - firewall comments/chains
  - dnsmasq includes
  - watchdog/runtime process naming
  - install defaults

Do not treat a passing grep-only validator as sufficient proof of coexistence safety.

## Bottom Line

The repo no longer has the earlier package uninstall overlap, but it still contains meaningful inherited OpenClash debt in live runtime paths.

The most important remaining work is:

1. remove active runtime/comment/chain overlap
2. eliminate the `network.lua` patch dependency
3. only then do the broad helper/log rename sweep
