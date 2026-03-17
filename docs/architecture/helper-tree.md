# Backend Helper Tree

Status: Accepted

Issue:
- #44

Epic:
- #28

## Purpose

Define the concern-based layout under `root/usr/share/clashnivo/` and make the transitional compatibility-wrapper policy explicit.

## Helper Tree Layout

The backend helper root remains:

- `luci-app-clashnivo/root/usr/share/clashnivo/`

Within that root, the active implementation is organized by concern:

- `lib/`
  - shared shell, Lua, and Ruby helpers
- `runtime/`
  - lifecycle, config generation, watchdog, and runtime orchestration helpers
- `update/`
  - data/core/dashboard update helpers
- `import/`
  - reserved home for one-time OpenClash import tooling
- `res/`
  - bundled static resource files
- `ui/`
  - separately shipped external dashboard assets

## Transitional Wrapper Rule

Top-level helper filenames under `root/usr/share/clashnivo/` still exist for now as compatibility wrappers.

Those wrappers are intentionally temporary and exist only to avoid breaking the current call sites that still hardcode paths such as:

- `/usr/share/clashnivo/openclash.sh`
- `/usr/share/clashnivo/openclash_update.sh`
- `/usr/share/clashnivo/log.sh`
- `/usr/share/clashnivo/openclash_get_network.lua`

The wrappers are not the target architecture. The target architecture is the concern-based implementation tree under `lib/`, `runtime/`, `update/`, and later `import/`.

## Current Concern Mapping

### Shared Library Helpers

Examples now living under `lib/`:

- `log.sh`
- `ruby.sh`
- `uci.sh`
- `openclash_curl.sh`
- `openclash_ps.sh`
- `openclash_get_network.lua`
- `openclash_urlencode.lua`
- `YAML.rb`

### Runtime Helpers

Examples now living under `runtime/`:

- `openclash.sh`
- `openclash_core.sh`
- `openclash_rule.sh`
- `openclash_watchdog.sh`
- `openclash_custom_domain_dns.sh`
- `yml_change.sh`
- `yml_groups_set.sh`

### Update Helpers

Examples now living under `update/`:

- `openclash_update.sh`
- `openclash_geoip.sh`
- `openclash_geosite.sh`
- `openclash_geoasn.sh`
- `openclash_ipdb.sh`
- `openclash_chnroute.sh`
- `openclash_download_rule_list.sh`
- `openclash_download_dashboard.sh`

### Import Placeholder

- `import/README.md` exists as a reserved stable home for later one-time import implementation.

## Rules For Later Tickets

- New helper implementation should land in the concern directory, not the top-level wrapper namespace.
- Later path-cleanup tickets may update callers to use the concern-owned paths directly.
- When a wrapper becomes unused, it should be removed deliberately in a cleanup ticket rather than by accident.

## References

- `docs/architecture/repo-layout.md`
- `docs/decision/service-ownership.md`
- `docs/decision/openclash-import-scope.md`
