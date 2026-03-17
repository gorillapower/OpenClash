# Service Ownership

Status: Accepted

Issue:
- #36

## Purpose

Define all `clashnivo`-owned files, temp paths, logs, service names, and generated state.

## Ownership Map

### Ownership Rule

- Clash Nivo runtime ownership must be fully namespaced under `clashnivo`.
- Runtime-owned artifacts must not rely on `openclash` names once the backend rewrite is complete.
- Inherited `openclash_*` names still present in the current repo are transitional debt, not accepted target architecture.

### Persistent Configuration And State

- `/etc/config/clashnivo`
  - primary UCI configuration owned by Clash Nivo
- `/etc/clashnivo/`
  - top-level Clash Nivo state directory
- `/etc/clashnivo/config/`
  - source configs and active config inputs selected by the product
- `/etc/clashnivo/custom/`
  - user-managed custom rule, DNS, proxy-group, and override inputs
- `/etc/clashnivo/overwrite/`
  - structured overwrite assets owned by Clash Nivo
- `/etc/clashnivo/history/`
  - history/reporting artifacts associated with configs
- `/etc/clashnivo/core/`
  - Clash core binaries and related managed runtime assets
- `/etc/clashnivo/rule_provider/`
  - rule-provider files owned or materialized by Clash Nivo
- `/etc/clashnivo/game_rules/`
  - bundled game rule assets
- `/etc/clashnivo/*.yaml`
  - generated or imported Clash Nivo config files when present
- `/etc/clashnivo/*.db`
  - persistent databases owned by the runtime, including cache/history databases
- `/etc/clashnivo/Country.mmdb`
- `/etc/clashnivo/GeoSite.dat`
- `/etc/clashnivo/GeoIP.dat`
- `/etc/clashnivo/Model.bin`
- `/etc/clashnivo/china_ip_route.ipset`
- `/etc/clashnivo/china_ip6_route.ipset`
- `/etc/clashnivo/clash`
  - managed symlink or active core entrypoint owned by Clash Nivo

### Runtime-Temporary State

- `/tmp/clashnivo.log`
  - primary runtime log
- `/tmp/clashnivo_start.log`
  - service startup log
- `/tmp/clashnivo.change`
  - change-detection input snapshot
- `/tmp/etc/clashnivo/`
  - temporary runtime/cache staging area on small-flash targets
- `/tmp/clashnivo*`
  - reserved prefix for future temporary files, sockets, locks, and generated reports

### Program And Service Names

- init service name: `clashnivo`
- procd primary instance name: `clashnivo`
- any secondary procd instances must use `clashnivo-*`
- runtime helper scripts should converge on `/usr/share/clashnivo/clashnivo_*`
- Lua/Ruby/helper modules under `/usr/share/clashnivo/` are owned by Clash Nivo even if some filenames still use inherited `openclash_*` prefixes today

### Shared Program Directory

- `/usr/share/clashnivo/`
  - owned helper/runtime directory for service scripts, parsers, validators, diagnostics, and update helpers
- `/usr/share/clashnivo/ui/`
  - UI assets owned by Clash Nivo
- `/usr/share/clashnivo/res/`
  - bundled static resources owned by Clash Nivo

### Firewall Ownership

- nftables chains created by Clash Nivo must use the `clashnivo` prefix
- nftables sets created by Clash Nivo must use the `clashnivo` prefix
- nftables comments inserted by Clash Nivo must include `clashnivo`
- iptables compatibility artifacts, where still present during transition, must also use `clashnivo` naming
- known chain names already visible in current runtime paths include:
  - `clashnivo`
  - `clashnivo_output`
  - `clashnivo_mangle`
  - `clashnivo_mangle_output`
  - `clashnivo_upnp`

### DNS And Routing Ownership

- dnsmasq integration owned by Clash Nivo must be identifiable by `clashnivo` comments, include fragments, or generated file names
- policy-routing and TPROXY artifacts created by Clash Nivo must use `clashnivo`-owned names where the platform allows naming
- generated routing state that cannot be directly named must still be traceable back to `clashnivo` through the controlling service and generated config inputs

### Cron Ownership

- cron entries managed by Clash Nivo must invoke commands from `/usr/share/clashnivo/`
- cron markers should be grep-detectable using `clashnivo` names where practical
- inherited cron targets such as `openclash.sh`, `openclash_ipdb.sh`, and `openclash_geosite.sh` are transitional debt and should be renamed in later implementation tickets

### Generated Reports And Logs

- runtime and diagnostic logs should use the `clashnivo` prefix
- generated reports, history snapshots, and validation outputs should live under `/etc/clashnivo/`, `/tmp/clashnivo*`, or another explicitly documented `clashnivo` path

### Upstream-Owned Vs Clash Nivo-Owned

- Upstream-owned state includes:
  - `/etc/config/openclash`
  - `/etc/openclash/`
  - `/usr/share/openclash/`
  - `/tmp/openclash*`
  - service/procd/runtime artifacts named `openclash`
  - firewall comments/chains/sets named `openclash`
- Clash Nivo must not treat upstream-owned runtime state as part of its normal operating model
- The only allowed read path into upstream-owned state is the one-time import flow defined separately

### Validation Rule For Later Tickets

- Later implementation and cleanup tickets should be able to validate ownership with grep-style checks for:
  - `openclash`
  - `OpenClash`
  - `clashnivo`
- Success means active Clash Nivo runtime ownership is fully attributable to `clashnivo` and no required runtime artifact still depends on upstream names.

## Notes

- Current repo layout already uses major `clashnivo` filesystem roots such as `/etc/config/clashnivo`, `/etc/clashnivo`, and `/usr/share/clashnivo`.
- Current repo layout still contains many helper scripts with inherited `openclash_*` filenames. This document classifies those as transitional implementation debt so later rename and cleanup work has a clear architectural target.
