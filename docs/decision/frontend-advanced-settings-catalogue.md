# Frontend Advanced Settings And Feature Catalogue

Status: Accepted

Issue:
- #82

## Purpose

Create a plain-language catalogue of the inherited advanced and system-facing Clash Nivo settings surface so later frontend work can make deliberate keep, redesign, defer, and exclude decisions instead of guessing from UCI option names or legacy OpenClash wording.

This document is intentionally narrower than the broad feature audit in `frontend-feature-audit.md`.
It focuses on the advanced and system-heavy surface that will matter for `System` page follow-up work, especially `#88`.

## How To Use This Catalogue

Use this document as the decision baseline when exposing advanced settings in the UI.

Rules:
- do not expose an inherited setting just because it already exists in UCI
- do not exclude an inherited setting just because the name is obscure
- prefer grouping by operator intent, not by backend file or shell-script origin
- keep the primary `System` baseline small; move deeper controls into advanced sections
- if a setting cluster still lacks a stable product meaning, defer it rather than surface it badly

Decision classes used here:
- `Keep`: retain as a supported product capability
- `Keep, redesign`: retain the capability but change naming, grouping, or UX significantly
- `Keep as advanced only`: supported, but not part of the primary flow
- `Defer`: do not expose in v1 advanced UI until the product meaning or backend contract is clearer
- `Exclude`: do not promote as a user-facing setting in Clash Nivo v1

## Audit Basis

This catalogue was derived from the current inherited and reset surface, especially:
- `luci-app-clashnivo/root/etc/config/clashnivo`
- `luci-app-clashnivo/ui/src/pages/settings/NetworkTab.svelte`
- `luci-app-clashnivo/ui/src/pages/settings/ClashConfigTab.svelte`
- inherited runtime/update helpers under `luci-app-clashnivo/root/usr/share/clashnivo/`
- accepted frontend reset decisions in:
  - `frontend-product-model.md`
  - `frontend-information-architecture.md`
  - `frontend-feature-audit.md`
  - `core-artifact-source.md`

## Catalogue Summary

The advanced/system surface should be grouped into these product sections:
1. Maintenance policy
2. Dashboard and external integrations
3. Traffic interception and runtime mode
4. DNS behavior
5. Device access and LAN policy
6. Performance and compatibility overrides
7. Composition escape hatches
8. Logging and diagnostics
9. Download source overrides for supporting assets
10. Deferred or internal-only legacy toggles

The main product judgment is:
- a meaningful subset of inherited advanced settings should survive
- the old surface is too implementation-shaped to expose directly
- advanced settings should be grouped by operator goal and explained in plain language
- `System` should still feel smaller than old OpenClash even after these controls are retained

## 1. Maintenance Policy

### Source refresh schedule

Examples:
- source refresh interval controls already surfaced on `Sources`
- inherited auto-update style cadence controls

Decision:
- `Keep, redesign`

Why:
- scheduled refresh is operationally important
- the UI must describe intent clearly: how often source material is refreshed
- this belongs near source inventory or maintenance scheduling, not mixed with unrelated runtime toggles

UI direction:
- keep on `Sources` for source-scoped schedules
- if a global schedule summary is shown in `System`, present it as maintenance overview rather than duplicate editing surface

### Planned restart behavior

Examples:
- planned restart behavior where supported by backend/runtime contract
- delay-style startup/restart timing such as `delay_start`

Decision:
- `Keep as advanced only`

Why:
- useful for operators managing fragile routers or scheduled maintenance windows
- not part of normal daily flow

UI direction:
- group under `System > Maintenance policy`
- explain when the restart happens and what it affects

### Package / core / assets update cadence

Examples:
- `auto_update`
- `auto_update_time`
- package/core/assets update controls already surfaced in baseline `System`

Decision:
- `Keep, redesign`

Why:
- maintenance cadence matters
- old generic update toggles are too ambiguous

UI direction:
- present explicit domains:
  - package
  - core
  - assets
- if scheduled automation remains limited, show current support truthfully rather than pretending full scheduling exists for every domain

## 2. Dashboard And External Integrations

### Dashboard type and dashboard forwarding

Examples:
- `dashboard_type`
- `yacd_type`
- `dashboard_forward_ssl`
- dashboard download/update helpers under `update/openclash_download_dashboard.sh`

Decision:
- `Keep, redesign`

Why:
- external dashboard access is an important supported capability
- the old naming is inherited and confusing
- forwarding SSL is operationally meaningful, not clutter

UI direction:
- keep dashboard access in `System`
- present dashboard choice and dashboard transport/proxying settings in an `External dashboards` section
- default v1 support remains a single recommended dashboard path, currently `zashboard`
- additional dashboard management can remain limited or deferred, but the integration itself is kept

### Dashboard asset management

Decision:
- `Keep as advanced only`

Why:
- useful, but not part of primary router-control story
- should not displace product-owned Status/Sources/Compose/System flows

## 3. Traffic Interception And Runtime Mode

### Operation mode

Examples:
- `en_mode`
- `operation_mode`
- fake-ip / redir-host / tun behavior

Decision:
- `Keep`

Why:
- one of the most important advanced runtime settings
- changes how the whole router routes traffic

UI direction:
- expose in `System > Traffic mode`
- use product language and practical descriptions, not backend values alone
- recommended/default choice should be explicit

### UDP proxy and stack type

Examples:
- `enable_udp_proxy`
- `stack_type`

Decision:
- `Keep`

Why:
- material runtime behavior with understandable operator tradeoffs

UI direction:
- same `Traffic mode` section
- explain compatibility vs performance tradeoffs

### Proxy mode / rule mode / operation variants

Examples:
- `proxy_mode`
- `enable_rule_proxy`
- `smart_enable`

Decision:
- `Keep as advanced only`

Why:
- important, but these settings need better semantics than the inherited names provide
- some are tightly coupled to specific runtime behaviors and should not be surfaced until wording is stable

UI direction:
- do not expose raw UCI names
- explain whether the setting affects routing policy, rule evaluation style, or smart selection behavior

## 4. DNS Behavior

### DNS capture mode

Examples:
- `enable_redirect_dns`
- `redirect_dns`

Decision:
- `Keep`

Why:
- central network behavior with clear operator impact

UI direction:
- expose as `DNS capture method` or equivalent
- explain recommended path and when to use alternatives

### DNS cache and AAAA filtering

Examples:
- `disable_masq_cache`
- `cachesize_dns`
- `filter_aaaa_dns`
- manual DNS cache flush action

Decision:
- `Keep as advanced only`

Why:
- useful for troubleshooting and compatibility
- not needed for most operators unless something is broken or specialized

UI direction:
- group under `DNS > Advanced`
- keep cache flush as a utility action

### Custom DNS server sets and fallback behavior

Examples:
- `config dns_servers`
- `enable_custom_dns`
- `append_default_dns`
- `append_wan_dns`
- `enable_respect_rules`
- `custom_fallback_filter`
- `custom_fakeip_filter`
- `custom_host`
- `custom_name_policy`

Decision:
- `Keep, redesign`

Why:
- this is a real product capability, but the inherited shape is too low-level and too easy to misunderstand
- should not be surfaced as a raw dump of DNS server sections and obscure filters

UI direction:
- do not rebuild the full raw list editor first
- v1 advanced UI should prefer grouped intent:
  - primary resolvers
  - fallback resolvers
  - filtering/host overrides
  - behavior toggles
- deeper structured editing can follow later if needed

### IPv6 DNS behavior

Examples:
- `ipv6_dns`
- IPv6-aware fallback entries in `dns_servers`

Decision:
- `Keep as advanced only`

Why:
- important when IPv6 is enabled, but secondary otherwise

## 5. Device Access And LAN Policy

### Device access mode

Examples:
- `lan_ac_mode`
- `lan_ac_black_ips`
- `lan_ac_black_macs`
- `lan_ac_white_ips`
- `lan_ac_white_macs`
- `intranet_allowed`

Decision:
- `Keep`

Why:
- device scoping is a meaningful operator feature
- already partially translated into a usable model in the unfinished UI

UI direction:
- expose as device access policy:
  - all devices
  - blacklist
  - whitelist
- keep IP/MAC editing in contained advanced sheets if needed
- explain clearly what traffic is affected

### Router self-proxy and common ports

Examples:
- `router_self_proxy`
- `common_ports`

Decision:
- `Keep as advanced only`

Why:
- operationally important but not intuitive from names alone
- should be documented in context

UI direction:
- group under `LAN and router policy`
- explain safe default and why an operator would change it

## 6. Performance And Compatibility Overrides

### QUIC, gateway compatibility, small flash, tolerance

Examples:
- `disable_udp_quic`
- `bypass_gateway_compatible`
- `small_flash_memory`
- `tolerance`
- `delay_start`

Decision:
- `Keep as advanced only`

Why:
- these are exactly the sort of settings that look like clutter until something breaks
- they belong in advanced runtime compatibility, not hidden forever and not exposed without explanation

UI direction:
- group under `Compatibility and performance`
- each setting needs one-sentence helper text about when it matters

### Interface binding and port exposure helpers

Examples:
- `interface_name`
- `proxy_port`
- `tproxy_port`
- `mixed_port`
- `socks_port`
- `http_port`
- `dns_port`
- `cn_port`

Decision:
- `Keep as advanced only`

Why:
- real runtime configuration, but too sharp for the baseline system UI
- port changes can break dashboards, diagnostics, and client setup if presented casually

UI direction:
- group under `Ports and interfaces`
- require explicit labels and helper text
- do not surface all of these in the baseline System summary

## 7. Composition Escape Hatches

### Advanced YAML source editing

Examples:
- `AdvancedYamlSheet.svelte`
- direct raw source editing mental model

Decision:
- `Keep as advanced only`

Why:
- useful escape hatch for experienced operators
- explicitly not the primary Clash Nivo model

UI direction:
- keep secondary to structured Sources/Compose flows
- label as advanced and risky

### Overwrite editing

Examples:
- `config_overwrite`
- overwrite source URL / update cadence
- `ConfigOverwriteSheet.svelte`

Decision:
- `Keep as advanced only`

Why:
- overwrite is part of the accepted composition model, but it is intentionally the highest-friction escape hatch

UI direction:
- keep under `Compose`
- not part of `System`
- explain that overwrite applies to generated config, not source inventory

### Custom firewall rules editing

Examples:
- `FirewallRulesSheet.svelte`
- raw custom rule file style editing

Decision:
- `Defer`

Why:
- currently too close to implementation detail
- should not be promoted into the reset UI until the ownership and user need are clearer

UI direction:
- do not make this part of `#88`
- revisit later if there is a clear product case

## 8. Logging And Diagnostics

### Log level and log size

Examples:
- `log_level`
- `log_size`

Decision:
- `Keep as advanced only`

Why:
- real operational controls
- should live alongside logs and diagnostics, not mixed with runtime mode or updates

UI direction:
- group under `Logs and diagnostics`
- explain disk/memory tradeoffs where relevant

### Diagnostics actions

Examples:
- DNS cache flush
- debug/report entrypoints
- update status surfaces

Decision:
- `Keep`

Why:
- useful and already aligned with the maintenance/system page purpose

UI direction:
- actions should be explicit and low-ambiguity
- diagnostics should use product language instead of legacy shell wording

## 9. Download Source Overrides For Supporting Assets

### Asset custom URLs and mirrors

Examples:
- `geo_custom_url`
- `geosite_custom_url`
- `geoip_custom_url`
- `geoasn_custom_url`
- `chnr_custom_url`
- `chnr6_custom_url`
- `github_address_mod`
- `urltest_address_mod`
- `urltest_interval_mod`

Decision:
- `Keep as advanced only`

Why:
- these are operationally important, especially in environments where GitHub reachability is unreliable
- they must not be dismissed as clutter
- but they are also far too specialized for the baseline System page

UI direction:
- group under `Download sources and mirrors`
- explain which domains they affect:
  - asset downloads
  - GitHub-based fetches
  - URL testing behavior
- do not expose as raw inherited names in the final UI

### Core source policy controls

Examples:
- `core_source`
- `core_custom_base_url`

Decision:
- `Keep as advanced only`

Why:
- now backed by the accepted runtime contract from `core-artifact-source.md`
- important, but intentionally left read-only in `#87`

UI direction:
- if exposed later, keep under `Download sources and mirrors`
- make source policy explicit:
  - OpenClash
  - Clash Nivo
  - Custom
- explain risk of custom layout mismatch

## 10. Deferred Or Internal-Only Legacy Toggles

### Legacy or unclear toggles that should not be exposed yet

Examples:
- `rule_source`
- `servers_if_update`
- `servers_update`
- `stream_auto_select`
- `store_fakeip`
- `other_rule_auto_update`

Decision:
- `Defer`

Why:
- these settings either lack a clear product framing today or are too entangled with inherited implementation behavior
- exposing them now would lower UI quality and operator confidence

Required follow-up standard:
- before any deferred toggle is exposed, its meaning must be rewritten in plain product language and linked to a clear operator need

### Duplicate / legacy naming artifacts

Examples:
- duplicated or overlapping names such as `en_mode` and `operation_mode`
- inherited helper-facing naming patterns still visible in UCI

Decision:
- `Exclude` as direct user-facing vocabulary

Why:
- these are migration and naming debt, not product concepts

UI direction:
- never expose these raw labels directly in the final UI
- map to one canonical product term or keep backend-only

## Recommended Grouping For Future `System` UI

For later implementation, the advanced `System` UI should be grouped as:

1. `Maintenance policy`
- schedules
- planned restart behavior
- maintenance cadence

2. `External dashboards`
- dashboard access
- dashboard transport / forwarding SSL
- dashboard variant where supported

3. `Traffic mode`
- operation mode
- stack type
- UDP proxy
- related routing behavior

4. `DNS`
- capture mode
- advanced DNS server behavior
- cache / filter / flush tools

5. `LAN and router policy`
- device access mode
- router self proxy
- common ports
- intranet access behavior

6. `Compatibility and performance`
- QUIC disable
- gateway compatibility
- flash/memory-related tuning
- startup tolerance/delay style settings

7. `Ports and interfaces`
- listen ports
- interface binding

8. `Download sources and mirrors`
- asset custom URLs
- GitHub or URL-test modifiers
- core source policy if later exposed

9. `Logs and diagnostics`
- log level
- log size
- cache flush and diagnostic actions

## Explicit Non-Goals For `#88`

`#88` should not attempt to:
- expose every inherited UCI option
- rebuild raw DNS server list editing in full if the product framing is still weak
- surface deferred toggles without clearer meaning
- promote raw script vocabulary into the UI
- move overwrite or advanced YAML source editing into `System`

`#88` should focus on the advanced runtime and maintenance settings that already have a clear operator-facing meaning.

## Decision Outcome

Clash Nivo should keep a meaningful advanced/system settings surface, but it should be smaller, better grouped, and more explainable than the inherited OpenClash UI.

The key product rule is:
- keep advanced power where it serves a real operator need
- remove inherited ambiguity
- defer settings that cannot yet be explained clearly
- do not let advanced/system settings sprawl redefine the primary Clash Nivo experience
