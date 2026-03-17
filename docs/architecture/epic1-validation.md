# Epic 1 Validation

Status: Accepted

Issue:
- #45

Epic:
- #28

## Purpose

Provide a repeatable validation command for the Epic 1 restructure work so later tickets can prove they are reducing inherited OpenClash coupling and boundary leakage instead of moving it around.

## Command

Run:

```bash
bash luci-app-clashnivo/tools/validate-epic1-boundaries.sh
```

The command is expected to return:

- `0` when the Epic 1 boundary scope is clean
- `1` when it finds active-scope leakage that later tickets still need to remove
- `2` when a required tool such as `rg` is missing

## Validation Scope

The validator is intentionally narrow. It checks the paths Epic 1 is restructuring:

- `luci-app-clashnivo/luasrc/`
- `luci-app-clashnivo/Makefile`
- `luci-app-clashnivo/root/etc/uci-defaults/`
- `luci-app-clashnivo/root/usr/share/rpcd/`
- `luci-app-clashnivo/root/usr/share/ucitrack/`
- `luci-app-clashnivo/ui/`

The validator reports these categories:

- legacy `openclash`/`OpenClash` naming in active Clash Nivo boundary paths
- direct controller-to-runtime hardcoding where the LuCI backend adapter should be used
- transitional legacy runtime targets still encapsulated inside `luci.clashnivo.backend`
- local UI development artifact leakage such as `node_modules`, `test-results`, and `.DS_Store`

## Transitional Exclusions

The validator intentionally does not try to solve the whole rewrite in one ticket.

Excluded for now:

- the inherited service implementation under `root/etc/init.d/`
- inherited helper implementation internals under:
  - `root/usr/share/clashnivo/runtime/`
  - `root/usr/share/clashnivo/update/`
  - `root/usr/share/clashnivo/lib/`
  - `root/usr/share/clashnivo/import/`
- translation strings and copied upstream content outside the Epic 1 boundary scope
- global CI enforcement for the whole project

Those areas are still expected to contain inherited `openclash_*` filenames and other debt until later runtime/update tickets move them toward the accepted service ownership model.

## How To Use The Output

The validator is a progress instrument, not just a pass/fail gate.

- Early Epic 1 and Epic 2 runs are expected to show findings.
- Later tickets should reduce findings in the categories they touch.
- If a ticket changes the intended boundary scope, update this document first.

## References

- `docs/decision/service-ownership.md`
- `docs/decision/service-contract.md`
- `docs/architecture/repo-layout.md`
