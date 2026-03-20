# Ruby Composition Dependency

Status: Accepted

Issue:
- #104

## Purpose

Define whether Clash Nivo should keep, contain, or replace Ruby in the live YAML composition pipeline.

## Decision Summary

Clash Nivo keeps Ruby as the v1 YAML mutation engine, but treats it as a contained runtime dependency rather than incidental inherited debt.

The project position is:
- keep Ruby for the current v1 composition and overwrite pipeline
- make the dependency explicit and intentional
- do not expand Ruby usage into new product areas unless there is a concrete reason
- plan any replacement as a dedicated later rewrite, not opportunistic cleanup

This is a fresh-install decision for Clash Nivo itself. Ruby is retained because current Clash Nivo behavior still depends on it materially, not because OpenClash happened to use it before.

## Why Ruby Stays For V1

The live runtime still uses Ruby for more than one narrow helper.

Current Ruby-dependent paths include:
- startup config parse validation in `root/etc/init.d/clashnivo`
- overwrite module execution and deferred overwrite batching in `root/etc/init.d/clashnivo`
- the shared mutation/read helper surface in `root/usr/share/clashnivo/lib/ruby.sh`
- source normalization and DNS/provider inspection in `root/usr/share/clashnivo/runtime/yml_change.sh`
- custom rule composition in `root/usr/share/clashnivo/runtime/yml_rules_change.sh`
- refresh/import validation and YAML inspection in `root/usr/share/clashnivo/runtime/clashnivo_refresh.sh`
- watchdog config/provider inspection in `root/usr/share/clashnivo/runtime/clashnivo_watchdog.sh`
- preview parse validation in `root/usr/share/clashnivo/service/preview.sh`
- debug output filtering in `root/usr/share/clashnivo/runtime/clashnivo_debug.sh`
- proxy/group inventory reads in `root/usr/share/clashnivo/runtime/yml_groups_get.sh`, `yml_groups_name_get.sh`, and `yml_proxys_get.sh`

The package also declares Ruby explicitly in `luci-app-clashnivo/Makefile`:
- `+ruby`
- `+ruby-yaml`

This means Ruby is not currently optional. Removing it now would require replacing the active parser, the overwrite command interface, and multiple read/validation utilities together.

## Why Ruby Should Not Be Removed Opportunistically

Removing Ruby cleanly is not a search-and-replace task.

Current Ruby behavior carries real product semantics:
- YAML parsing and writeback for generated config files
- ordered overwrite batching through `/tmp/yaml_clashnivo_ruby_parts` and `/tmp/yaml_clashnivo_ruby_parse`
- the user-facing overwrite command API:
  - `ruby_edit`
  - `ruby_merge_hash`
  - `ruby_arr_insert`
  - `ruby_delete`
  - related helpers
- YAML-specific normalization in `root/usr/share/clashnivo/lib/YAML.rb`, especially `short-id` quoting preservation

Replacing Ruby without redesign would risk:
- overwrite behavior drift
- source normalization drift
- broken advanced overwrite examples and custom scripts
- validation mismatches between preview, startup, and refresh paths

That is too much coupled behavior to treat as incidental cleanup during hardening.

## Tradeoff Assessment

### Correctness

Ruby currently gives Clash Nivo a real YAML parser and emitter rather than brittle line-based text mutation.

That is especially important for:
- nested DNS structures
- provider maps
- array insertion and merge behavior
- overwrite scripts that target arbitrary YAML paths
- preserving `short-id` string semantics through the custom YAML wrapper

### Maintainability

Ruby hurts maintainability in two ways:
- the mutation surface is spread across shell strings that generate Ruby code
- error reporting and debugging cross shell, Ruby, and YAML wrapper layers

But replacing it immediately would produce a larger maintenance risk than keeping it.

The safer move is to constrain it behind the existing helper boundary and stop pretending it is temporary incidental debt.

### Dependency Footprint

Ruby is a heavy runtime dependency for an OpenWrt package.

That cost is real:
- package size
- install footprint
- startup/runtime dependency chain

But the package already depends on Ruby today. The right time to challenge that dependency is when Clash Nivo has a replacement design that covers the full behavior surface, not before.

### Debugging And Validation Clarity

Today the main weakness is not only that Ruby exists. It is that the dependency boundary is implicit.

This decision makes the boundary explicit:
- Ruby is the v1 YAML mutation engine
- `lib/ruby.sh` is the mutation helper surface
- `lib/YAML.rb` is part of the supported parser/writeback contract

That gives later work a clear target for replacement if the project decides the dependency is no longer justified.

## Decision Rules Going Forward

### Accepted For V1

Ruby remains accepted for:
- startup YAML parse validation
- generated-config overwrite execution
- structured helper-driven YAML mutation
- YAML inspection required by refresh, preview, watchdog, and debug flows

### Constrain The Boundary

New work should:
- prefer routing YAML mutation through `root/usr/share/clashnivo/lib/ruby.sh`
- avoid scattering ad hoc `ruby -e` snippets into new modules unless the helper surface is insufficient
- treat `root/usr/share/clashnivo/lib/YAML.rb` as part of the supported runtime contract

### Do Not Expand Carelessly

New product features should not default to new Ruby-only scripting surfaces if a simpler structured shell/Lua path is sufficient.

In particular:
- UI-facing structured composition features should prefer explicit data models
- Ruby should remain the escape hatch and mutation engine behind the service boundary, not the primary product abstraction

## Replacement Criteria

Ruby should only be replaced by a dedicated follow-up effort that proves parity for:
- startup parse validation
- overwrite helper behavior
- overwrite batching behavior
- YAML read helpers currently used by refresh/debug/watchdog
- `short-id` preservation behavior from `lib/YAML.rb`

Any replacement proposal must define:
- the new runtime dependency set
- the new mutation/read interface
- migration strategy for existing overwrite helpers and examples
- validation parity across preview, refresh, and startup

Until that exists, Ruby should be treated as supported v1 infrastructure.

## Non-Goals

This decision does not:
- rewrite the Ruby helper library
- remove Ruby from the package today
- redesign overwrite UX
- convert custom overwrite scripts into Lua or shell

Those are later implementation questions, not part of this decision.
