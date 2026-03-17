# UI Workspace Boundary

Status: Accepted

Issue:
- #42

Epic:
- #28

## Purpose

Define the source-of-truth UI workspace for Clash Nivo, the build output used for packaging, and the intentionally shipped UI assets that live outside the SPA build.

## Source Of Truth

The Clash Nivo SPA source of truth lives under:

- `luci-app-clashnivo/ui/src/`
- `luci-app-clashnivo/ui/index.html`
- `luci-app-clashnivo/ui/package.json`
- `luci-app-clashnivo/ui/vite.config.ts`
- related test and tool config files under `luci-app-clashnivo/ui/`

Later UI work should treat this tree as the authoritative source for the Clash Nivo LuCI SPA.

## Build Output

The packaged SPA build output lives at:

- `luci-app-clashnivo/ui/dist/`

This is the only packaged input for the Clash Nivo SPA. The package build must copy this directory into the LuCI static asset path explicitly rather than relying on implicit file pickup.

## Packaged SPA Target

The packaged target for the Clash Nivo SPA is:

- `/www/luci-static/clash-nivo/`

At build time, `ui/dist/` is copied into:

- `$(PKG_BUILD_DIR)/root/www/luci-static/clash-nivo/`

At runtime, LuCI serves the SPA from:

- `/luci-static/clash-nivo/`

## Intentionally Shipped Non-SPA UI Assets

The directory below is not the Clash Nivo SPA build target:

- `luci-app-clashnivo/root/usr/share/clashnivo/ui/`

It is reserved for separately shipped external dashboard assets and related downloads, including directories such as:

- `metacubexd/`
- `zashboard/`

Those assets are intentionally packaged outside the SPA build and should be treated as separate shipped resources, not as part of the `ui/dist/` pipeline.

## Local-Only Development Artifacts

The following paths are local development artifacts and are not package source:

- `luci-app-clashnivo/ui/node_modules/`
- `luci-app-clashnivo/ui/test-results/`
- macOS `.DS_Store` files

These paths must be ignored and must not be used as inputs for packaging or source-of-truth UI decisions.

## Rules

- UI source changes should land in `luci-app-clashnivo/ui/`, not under packaged static output paths.
- Packaging changes must make the `ui/dist/` input path explicit.
- External dashboards under `root/usr/share/clashnivo/ui/` may remain packaged, but they are outside the Clash Nivo SPA source tree.
- Future cleanup can change how `ui/dist/` is produced, but not the rule that packaging consumes one explicit UI build output.

## Related Decisions

- `docs/architecture/repo-layout.md`
- `docs/decision/product-boundary.md`
- `docs/decision/service-contract.md`
