# Repo Layout

Status: Accepted

Issue:
- #41

Epic:
- #28

## Purpose

Define the target internal repo layout for Clash Nivo so later restructure tickets move code into one agreed shape.

This document translates the accepted Phase 0 product boundary, service ownership, service contract, and import scope into concrete repo-level module boundaries.

## Layout Rule

The repo stays a single user-facing package, but it is internally separated into these product concerns:
- UI
- LuCI entrypoints and RPC boundary
- runtime/service implementation
- import implementation
- shared helpers and resources
- packaging and build tooling

The point of this layout is not aesthetics. It is to stop UI, runtime, update, and import code from continuing to grow as one inherited OpenClash-shaped blob.

## Target Layout

The target internal layout for `luci-app-clashnivo/` is:

### Package Root

- `luci-app-clashnivo/Makefile`
  - package build and install logic only
- `luci-app-clashnivo/tools/`
  - developer and packaging helpers
- `luci-app-clashnivo/po/`
  - translations only

### UI Source

- `luci-app-clashnivo/ui/`
  - Clash Nivo SPA source tree
- `luci-app-clashnivo/ui/src/`
  - SPA source code
- `luci-app-clashnivo/ui/src/lib/`
  - SPA shared components and API clients
- `luci-app-clashnivo/ui/src/pages/`
  - page-level views
- `luci-app-clashnivo/ui/src/test/`
  - SPA tests

Rules:
- `ui/` is source-owned, not install-owned
- local development artifacts such as `node_modules`, transient test results, and local OS junk do not count as package source
- the packaged UI is produced from a defined build output, not by treating the whole `ui/` working tree as install material

### LuCI Entry And RPC Boundary

- `luci-app-clashnivo/luasrc/controller/`
  - LuCI routing and RPC entrypoints
- `luci-app-clashnivo/luasrc/view/`
  - LuCI bootstrap views only
- `luci-app-clashnivo/luasrc/clashnivo.lua`
  - LuCI-side shared Lua helpers where still needed
- `luci-app-clashnivo/luasrc/clashnivo/backend.lua`
  - LuCI-side backend adapter for service and helper dispatch

Rules:
- LuCI entrypoint code is the boundary between the SPA and the backend
- controller/view code must not become the long-term home of runtime orchestration details
- direct backend operations should flow through a named Clash Nivo backend adapter surface, not ad hoc shell command construction inside controllers

### Packaged Runtime Files

- `luci-app-clashnivo/root/etc/config/`
  - shipped UCI defaults
- `luci-app-clashnivo/root/etc/init.d/`
  - service entrypoint only
- `luci-app-clashnivo/root/etc/uci-defaults/`
  - install-time initialization only
- `luci-app-clashnivo/root/etc/clashnivo/`
  - packaged default assets and templates that land under `/etc/clashnivo/`

Rules:
- `root/etc/` is install image content, not a generic place to hide implementation decisions
- later service rewrite tickets may change what is installed, but package output under `root/etc/` remains the home for install-owned system files

### Backend Helper Tree

- `luci-app-clashnivo/root/usr/share/clashnivo/`
  - packaged backend helper root

Within that helper root, the target structure is:
- `.../runtime/`
  - lifecycle, network, and config generation helpers
- `.../update/`
  - core, GeoIP, GeoSite, and package update helpers
- `.../import/`
  - built-in OpenClash import detection, translation, and reporting helpers
- `.../lib/`
  - shared shell, Lua, and Ruby helper code
- `.../res/`
  - bundled static resources
- `.../ui/`
  - packaged UI assets only

Rules:
- runtime/service helpers, update helpers, import helpers, and shared libraries must not continue as one flat mixed directory
- shipped UI assets under `.../ui/` are package assets, not backend helper code
- inherited flat filenames are transitional debt until later tickets move or wrap them into concern-owned paths

### RPC And ACL Packaging

- `luci-app-clashnivo/root/usr/share/rpcd/`
  - RPC ACLs and rpcd-owned metadata only
- `luci-app-clashnivo/root/usr/share/ucitrack/`
  - UCI tracking metadata only

### Third-Party Dashboards

- `luci-app-clashnivo/root/usr/share/clashnivo/ui/`
  - packaged dashboard assets intentionally shipped with Clash Nivo

Rules:
- these assets are allowed to remain packaged if intentionally supported
- they are not the same concern as the Clash Nivo SPA source tree under `ui/`
- later tickets must document which packaged dashboards are first-class product assets versus transitional carryover

## Current Path Classification

### Target Paths

These already match the intended long-term shape or role:
- `luci-app-clashnivo/ui/src/`
- `luci-app-clashnivo/luasrc/controller/`
- `luci-app-clashnivo/luasrc/view/`
- `luci-app-clashnivo/root/etc/config/`
- `luci-app-clashnivo/root/etc/init.d/`
- `luci-app-clashnivo/root/etc/uci-defaults/`
- `luci-app-clashnivo/root/etc/clashnivo/`
- `luci-app-clashnivo/root/usr/share/rpcd/`
- `luci-app-clashnivo/root/usr/share/ucitrack/`
- `luci-app-clashnivo/tools/`
- `luci-app-clashnivo/po/`

### Transitional Paths

These are valid to keep temporarily but need cleanup or stronger boundaries:
- `luci-app-clashnivo/ui/dist/`
  - valid as build output, but it must be treated as generated packaging input, not hand-maintained source
- `luci-app-clashnivo/root/usr/share/clashnivo/`
  - correct root, but top-level inherited filenames remain as transitional compatibility wrappers over the concern-based implementation tree
- `luci-app-clashnivo/root/usr/share/clashnivo/ui/`
  - valid packaged asset root, but needs clearer separation between shipped UI assets and backend helper ownership
- `luci-app-clashnivo/luasrc/controller/clash_nivo_rpc.lua`
  - correct boundary location, but still carries direct runtime hardcoding that belongs behind a backend adapter

### Legacy Debt

These are not accepted as target architecture:
- `luci-app-clashnivo/ui/node_modules/`
  - local development dependency tree
- `luci-app-clashnivo/ui/test-results/`
  - generated test output
- local `.DS_Store` files and similar OS junk
- inherited `openclash_*` helper filenames as the long-term runtime surface
- direct controller references to legacy runtime script names as the stable backend boundary
- test fixtures or mocks that still treat `/etc/openclash/*`, `openclash` UCI, or `openclash` service names as the active Clash Nivo model

## Mapping Rules For Later Tickets

### UI Tickets

UI tickets should work inside:
- `ui/src/`
- explicit build tooling inside `ui/`
- packaged UI asset targets under `root/usr/share/clashnivo/ui/`

UI tickets must not:
- treat `node_modules/` or test output as source
- reach into runtime helper paths as a control plane

### LuCI Boundary Tickets

LuCI tickets should work inside:
- `luasrc/controller/`
- `luasrc/view/`
- any named backend adapter module introduced for RPC/service calls

LuCI tickets must not:
- encode long-term runtime behavior directly in controller shell strings
- bypass the service contract by reaching into implementation-only files unnecessarily

### Runtime/Service Tickets

Runtime tickets should work inside:
- `root/etc/init.d/`
- `root/etc/config/`
- `root/etc/clashnivo/`
- `root/usr/share/clashnivo/runtime/`
- `root/usr/share/clashnivo/lib/`

Runtime tickets must not:
- hide import logic inside generic update helpers
- hide UI-specific behavior in runtime helpers

### Update Tickets

Update tickets should converge under:
- `root/usr/share/clashnivo/update/`

Update tickets must not:
- remain mixed into the generic helper root without a clear concern boundary

### Import Tickets

Import tickets should converge under:
- `root/usr/share/clashnivo/import/`

Import tickets must not:
- depend on continued OpenClash runtime coexistence
- be buried as side effects inside ordinary runtime startup logic

## Change Control

Later Epic 1 tickets may move files and add wrappers, but they should preserve this layout model unless this document is updated first.

If a later ticket needs a different directory/module boundary, that change should be made here before the file moves become the new de facto architecture.

## References

- `docs/decision/product-boundary.md`
- `docs/decision/service-ownership.md`
- `docs/decision/service-contract.md`
- `docs/decision/openclash-import-scope.md`
- `docs/decision/runtime-guard-and-switching.md`
