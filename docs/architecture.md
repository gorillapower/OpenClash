# OpenClash — Solutions Architecture

> This document captures the full technical understanding of how OpenClash works, how it relates
> to the broader Clash ecosystem, and the architectural direction for a rewrite.
> Generated from deep codebase analysis — March 2026.

---

## Table of Contents

1. [What is OpenClash?](#1-what-is-openclash)
2. [The Clash Ecosystem](#2-the-clash-ecosystem)
3. [The Two-Layer Mental Model](#3-the-two-layer-mental-model)
4. [Layer 1 — Router Integration (Network Stack)](#4-layer-1--router-integration-network-stack)
5. [Layer 2 — Clash Configuration (Proxy Engine)](#5-layer-2--clash-configuration-proxy-engine)
6. [Traffic Interception Modes](#6-traffic-interception-modes)
7. [DNS Hijacking](#7-dns-hijacking)
8. [China Bypass Routing](#8-china-bypass-routing)
9. [Service Lifecycle](#9-service-lifecycle)
10. [Current Codebase Structure](#10-current-codebase-structure)
11. [The Clash REST API](#11-the-clash-rest-api)
12. [Comparison: OpenClash vs Clash Verge Rev](#12-comparison-openclash-vs-clash-verge-rev)
13. [The Clash Dashboard (Zashboard / yacd)](#13-the-clash-dashboard-zashboard--yacd)
14. [Current Pain Points](#14-current-pain-points)
15. [Proposed New Architecture](#15-proposed-new-architecture)

---

## 1. What is OpenClash?

OpenClash is a [Clash](https://github.com/MetaCubeX/mihomo) proxy client plugin for **OpenWrt routers**,
delivered as a LuCI (OpenWrt web interface) application. It allows policy-based proxy routing for
**all devices on the LAN** — phones, laptops, smart TVs — without any configuration on those devices.

It was originally developed by `vernesong` and is written primarily in Chinese (Lua + Shell).
This repository (`gorillapower/OpenClash`) is a fork with English-oriented improvements.

**What it does:**
- Runs the Clash/Mihomo proxy binary on the router
- Intercepts ALL network traffic from LAN devices transparently
- Routes traffic according to configurable rules (direct, proxy, reject)
- Manages DNS at the router level to enable domain-based routing
- Provides a web UI (via LuCI) for configuration and management

---

## 2. The Clash Ecosystem

Clash (and its maintained fork **Mihomo/Clash.Meta**) is a Go binary that:
- Runs as a background process/daemon
- Reads a single **YAML configuration file**
- Intercepts network traffic and routes it according to rules
- Exposes a **RESTful HTTP API** on a local port (default `9090`) for external control

**The core has no UI of its own.** Every GUI — desktop app, router plugin, mobile app — is a
wrapper around this same engine. They all do three things:
1. Manage the Clash binary (download, start, stop, restart)
2. Edit the YAML config (proxies, groups, rules, DNS)
3. Talk to the REST API (live status, proxy switching, connection monitoring)

### The Clash YAML — Core Concepts

```yaml
port: 7890              # HTTP proxy port
socks-port: 7891        # SOCKS5 proxy port
tproxy-port: 7895       # Transparent proxy port (router use)
dns-port: 7874          # DNS server port

mode: rule              # rule / global / direct
external-controller: 127.0.0.1:9090   # REST API

proxies:                # Your proxy servers (SS, VMess, Trojan, etc.)
proxy-groups:           # Logical groups (auto-select, fallback, load-balance)
rules:                  # Routing rules (domain → which group/proxy)
dns:                    # DNS resolver config (fake-ip, real-ip, upstream servers)
```

---

## 3. The Two-Layer Mental Model

**This is the most important concept for understanding OpenClash.**

OpenClash operates across two completely separate layers. The current UI conflates them,
which is the root cause of its complexity and confusion.

```
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 1: ROUTER INTEGRATION                    │
│             (OpenWrt-specific, shell scripts only)              │
│                                                                 │
│  • nftables/iptables  →  redirect LAN traffic to Clash         │
│  • dnsmasq            →  hijack DNS queries to Clash DNS        │
│  • ip rule/route      →  TPROXY routing tables for UDP         │
│  • nft sets           →  China IP bypass, LAN device control   │
│  • procd              →  OpenWrt process supervision           │
│  • cron               →  scheduled updates and restarts        │
│                                                                 │
│  Configured by: /etc/init.d/openclash (3,881-line shell script)│
└─────────────────────────────────────────────────────────────────┘
                    ↕  Clash listens passively on its ports
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 2: CLASH CONFIGURATION                   │
│             (Pure YAML, identical to all Clash GUIs)           │
│                                                                 │
│  • proxies        →  your proxy servers                        │
│  • proxy-groups   →  selection strategies                      │
│  • rules          →  routing policy                            │
│  • dns            →  resolver behaviour and fake-IP            │
│  • REST API       →  live control and monitoring               │
│                                                                 │
│  Configured by: /etc/openclash/*.yaml                          │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight:** Clash itself does **zero** firewall/network work. It just listens on its ports.
All traffic interception is set up by the shell scripts wrapping it.

---

## 4. Layer 1 — Router Integration (Network Stack)

### How Traffic Gets Into Clash

The router is a **network transit device** — packets from LAN devices pass through it on their way
to the internet. OpenClash intercepts this in-transit traffic transparently using the Linux kernel's
netfilter (nftables/iptables) subsystem.

### The Three Sub-Systems

#### 4a. DNS Hijacking

Every DNS query (UDP/TCP port 53) from any LAN device is silently redirected:

```
Device asks: "What's google.com?"
    ↓
nftables rule: redirect port 53 → dnsmasq (on router)
    ↓
dnsmasq configured: forward all queries → 127.0.0.1:7874 (Clash DNS)
    ↓
Clash DNS answers (real IP or fake IP depending on mode)
    ↓
Device receives answer and connects to that IP
```

**nftables rule (simplified):**
```
nft insert rule inet fw4 dstnat position 0
    meta l4proto {tcp,udp} th dport 53
    counter redirect to [dnsmasq-port]
```

**Why this matters:** Clash needs to know domain names to apply rules like
`DOMAIN-SUFFIX,google.com,Proxy`. Without DNS hijacking, it only sees raw IP addresses
at the packet level and cannot apply domain-based rules.

#### 4b. TCP Traffic Redirection

All TCP packets going *through* the router are REDIRECT'd to Clash's `redir-port`.
The kernel preserves the original destination IP in socket metadata — Clash reads it
to know where the packet was originally going.

```
nft add chain inet fw4 openclash
nft add rule inet fw4 openclash ip protocol tcp counter redirect to [proxy_port:7891]
nft add rule inet fw4 dstnat meta nfproto {ipv4} ip protocol tcp counter jump openclash
```

Exception rules run first (RETURN skips redirection):
1. Destination is local network → RETURN
2. Already-established connection reply → RETURN
3. Blacklisted LAN device → RETURN (LAN access control)
4. China IP destination (if bypass mode) → RETURN
5. Not in common ports list (redir-host mode only) → RETURN

#### 4c. UDP Traffic (TPROXY)

UDP cannot use NAT REDIRECT (it's connectionless). UDP uses TPROXY instead:

```bash
# Create a custom routing table
ip rule add fwmark 0x162 table 0x162
ip route add local 0.0.0.0/0 dev lo table 0x162

# Mark UDP packets, TPROXY them to Clash
nft add rule inet fw4 openclash_mangle
    meta l4proto { udp }
    mark set 0x162
    tproxy ip to 127.0.0.1:[tproxy_port:7895]
    counter accept
```

The fwmark (0x162) causes the custom routing table to route packets to loopback,
where Clash is listening with a TPROXY socket that preserves the original destination.

#### 4d. Startup Ordering (Critical)

Firewall rules are applied **AFTER** Clash starts, not before:

```
1. Read UCI config settings
2. Determine operation mode (redir-host/fake-ip/TUN)
3. Start Clash binary via procd
4. Wait for Clash to confirm running
5. (TUN mode) Wait for utun interface to appear
6. Apply DNS hijacking (change_dns)
7. Apply nftables/iptables firewall rules (set_firewall)
8. Set up cron jobs
```

---

## 5. Layer 2 — Clash Configuration (Proxy Engine)

This layer is **identical in concept** to any other Clash GUI (Verge, ClashX, etc.).
The YAML config file controls what Clash does once it receives traffic.

### Key YAML Sections

**proxies** — Individual proxy servers:
```yaml
proxies:
  - name: "SG-01"
    type: vmess
    server: sg.example.com
    port: 443
    uuid: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**proxy-groups** — Logical groupings with selection strategies:
```yaml
proxy-groups:
  - name: "Auto"
    type: url-test           # auto-select fastest
    proxies: [SG-01, US-01]
    url: "http://www.gstatic.com/generate_204"
    interval: 300
  - name: "Manual"
    type: select             # user picks manually
    proxies: [Auto, SG-01, US-01, DIRECT]
```

**rules** — Routing policy (evaluated top to bottom, first match wins):
```yaml
rules:
  - DOMAIN-SUFFIX,google.com,Manual
  - GEOIP,CN,DIRECT
  - MATCH,Manual            # default: everything else
```

**dns** — Resolver configuration:
```yaml
dns:
  enable: true
  enhanced-mode: fake-ip    # or redir-host
  fake-ip-range: 198.18.0.1/16
  nameserver:
    - 114.114.114.114
    - 8.8.8.8
  fallback:
    - tls://1.1.1.1:853
```

### Subscription Profiles

Rather than manually configuring proxies and groups, most users import a **subscription URL**
from a proxy service provider. The subscription is a YAML (or base64-encoded) file containing
pre-configured proxies and groups. OpenClash downloads and manages these files.

---

## 6. Traffic Interception Modes

OpenClash supports 6 mode variants, all combinations of two axes:

### Axis 1: DNS Mode

| Mode | How DNS works |
|------|---------------|
| **redir-host** | Clash receives connection → resolves domain normally → connects |
| **fake-ip** | Clash DNS returns fake IPs (198.18.x.x) → packet arrives with fake IP → Clash looks up domain from fake-IP mapping → connects with real domain |

**fake-ip is preferred** because:
- Domain is known immediately from DNS lookup, no second resolution needed
- Faster rule matching
- Better for streaming and games
- Only downside: some apps that cache IPs behave oddly

### Axis 2: Interception Method

| Method | TCP | UDP | How |
|--------|-----|-----|-----|
| **standard** | NAT REDIRECT | TPROXY | iptables/nftables |
| **tun** | Via utun interface | Via utun interface | Virtual network device |
| **mix** | REDIRECT for TCP | TUN for UDP | Hybrid |

### The 6 Named Modes

| Mode name | DNS | Interception | Use case |
|-----------|-----|--------------|----------|
| `redir-host` | redir-host | REDIRECT+TPROXY | Compatibility |
| `redir-host-tun` | redir-host | TUN | TUN with redir-host DNS |
| `redir-host-mix` | redir-host | Mixed | UDP via TUN only |
| `fake-ip` | fake-ip | REDIRECT+TPROXY | **Recommended default** |
| `fake-ip-tun` | fake-ip | TUN | Full TUN mode |
| `fake-ip-mix` | fake-ip | Mixed | UDP via TUN only |

### TUN Mode Detail

TUN mode creates a virtual network interface (`utun`) on the router. Traffic is routed through it
instead of using REDIRECT/TPROXY. The init script waits for the interface to appear before
proceeding:

```bash
while [ -z "$($ip_ route list | grep utun)" ] && [ "$TUN_WAIT" -le 120 ]; do
    sleep 1
    let TUN_WAIT++
done
```

Requires `kmod-tun` kernel module.

---

## 7. DNS Hijacking

### The `change_dns()` Function

When OpenClash starts with DNS redirect enabled, it modifies dnsmasq configuration:

```bash
change_dns() {
    # 1. Save original dnsmasq DNS servers to UCI (for restoration on stop)
    # 2. Remove all existing dnsmasq forwarders
    # 3. Set Clash as the ONLY DNS server: 127.0.0.1#7874
    # 4. Set dnsmasq.noresolv=1 (ignore /etc/resolv.conf)
    # 5. Set dnsmasq.cachesize=0 (let Clash handle caching)
    # 6. Restart dnsmasq
}
```

On shutdown, `revert_dns()` restores the original settings.

### Two DNS Redirect Methods

**Method 1 — dnsmasq redirect (recommended):**
- dnsmasq is configured to forward ALL queries to Clash DNS port
- Works with dnsmasq's existing infrastructure
- nftsets/ipsets can be populated by dnsmasq when domains resolve

**Method 2 — Firewall redirect:**
- nftables directly redirects port 53 → Clash DNS port
- Bypasses dnsmasq entirely for DNS
- Used when dnsmasq integration is problematic

### Domain-Based IP Set Population

A key feature: when a domain resolves to an IP, dnsmasq can add that IP to nftables sets.
This is how China bypass domains work — when `baidu.com` resolves to a China IP, it's
automatically added to the `china_ip_route_pass` set and bypasses the proxy.

```
# dnsmasq config generated by OpenClash:
nftset=/baidu.com/4#inet#fw4#china_ip_route_pass
```

---

## 8. China Bypass Routing

### The Problem

Chinese users need domestic traffic (baidu.com, taobao.com, WeChat) to go **direct** (faster,
no proxy needed) while foreign traffic goes through the proxy. The reverse is true for users
wanting to access blocked foreign content.

### Three-Part Implementation

**Part 1: IP Set** (`/etc/openclash/china_ip_route.ipset`)
A large nftables set containing all Chinese IP CIDR ranges (~7,000 entries). Loaded from
a regularly-updated list (chnroute). Example entries:
```
1.0.1.0/24
1.0.2.0/23
1.0.8.0/21
...
```

**Part 2: Domain-to-IP Mapping** (dnsmasq nftset rules)
dnsmasq config entries that add resolved IPs to the China IP set when a Chinese domain resolves.
Generated by OpenClash from the chnroute domain list.

**Part 3: Firewall Bypass Rules**

Mode 1 — Bypass China (domestic traffic goes direct):
```
nft add rule inet fw4 openclash ip daddr @china_ip_route counter return
```

Mode 2 — Proxy China only (foreign traffic goes direct):
```
nft add rule inet fw4 openclash ip daddr != @china_ip_route counter return
```

### Auto-Update

The China route lists are updated via cron job (`openclash_chnroute.sh`) on a configurable
schedule. Sources include Hackl0us and other maintained lists.

---

## 9. Service Lifecycle

### Start Sequence

```
/etc/init.d/openclash start
    │
    ├─ 1. Read all settings from UCI (/etc/config/openclash)
    ├─ 2. Determine operation mode
    ├─ 3. Validate Clash binary exists (/etc/openclash/clash)
    ├─ 4. Launch Clash via procd (process supervisor)
    │       clash -d /etc/openclash -f config.yaml
    ├─ 5. Wait for Clash HTTP API to respond (up to 120s)
    ├─ 6. (TUN modes) Wait for utun interface to appear
    ├─ 7. Apply DNS hijacking via change_dns()
    ├─ 8. Apply firewall rules via set_firewall()  ← 1,600-line function
    ├─ 9. Set up cron jobs via add_cron()
    └─ 10. Start watchdog process
```

### Stop Sequence

```
/etc/init.d/openclash stop
    │
    ├─ 1. Remove firewall rules
    ├─ 2. Restore DNS settings via revert_dns()
    ├─ 3. Remove cron jobs
    ├─ 4. Remove IP routes (TPROXY routing table)
    ├─ 5. Kill Clash process via procd
    └─ 6. Clean up temp files
```

### Process Management (procd)

OpenClash uses OpenWrt's `procd` process supervisor to manage the Clash binary:
- Auto-restart on crash
- Proper service priority (START=99, runs late in boot)
- Integration with OpenWrt's service management (`/etc/init.d/openclash start|stop|restart|status`)

### Watchdog

A separate watchdog process (`openclash_watchdog.sh`) monitors the Clash process and
auto-restarts if it crashes or becomes unresponsive.

---

## 10. Current Codebase Structure

```
luci-app-clashnivo/
├── luasrc/                     # LuCI frontend
│   ├── controller/
│   │   └── openclash.lua       # ~3,000 lines — HTTP routes + AJAX endpoints
│   ├── model/cbi/openclash/    # 22 Lua config pages
│   │   ├── settings.lua        # ~1,600 lines — global settings (15 tabs)
│   │   ├── config.lua          # Config file management
│   │   ├── config-subscribe.lua # Subscription management
│   │   ├── servers.lua         # Proxy server management
│   │   ├── groups-config.lua   # Proxy group management
│   │   └── ...                 # 17 more model files
│   ├── view/openclash/         # 42 HTML templates
│   └── openclash.lua           # Helper module (filesystem, UCI, network utils)
│
├── root/                       # Files installed to router filesystem
│   ├── etc/init.d/openclash    # 3,881-line main service script
│   ├── etc/uci-defaults/       # First-time setup script
│   ├── etc/openclash/custom/   # User-editable config files
│   └── usr/share/openclash/    # 42 shell scripts + Lua utilities
│       ├── openclash.sh        # Config download/apply (6,000+ lines)
│       ├── openclash_core.sh   # Core binary management
│       ├── openclash_rule.sh   # Rule file management
│       ├── openclash_geoip.sh  # GeoIP database updates
│       ├── yml_*.sh            # YAML parsing (8 scripts)
│       └── ...                 # 30+ more scripts
│
├── po/                         # Translations (Chinese, Spanish, English fallback)
└── tools/po2lmo/               # Translation compiler
```

### Key File Sizes (indicators of complexity)

| File | Lines | Problem |
|------|-------|---------|
| `init.d/openclash` | 3,881 | Everything in one file |
| `openclash.sh` | 6,000+ | Monolithic config script |
| `settings.lua` | ~1,600 | 15-tab settings nightmare |
| `controller/openclash.lua` | ~3,000 | All HTTP handling in one file |

---

## 11. The Clash REST API

Clash exposes a comprehensive REST API at `http://127.0.0.1:9090/api/` (configurable port).
This API is used by dashboards (Zashboard, yacd) for live monitoring and control.

### Key Endpoints

```
GET  /configs              → Current running config
PATCH /configs             → Hot-reload config (no restart needed)
GET  /proxies              → All proxies and groups
PUT  /proxies/{group}      → Switch selected proxy in group
GET  /connections          → All active connections
DELETE /connections        → Close all connections
GET  /rules                → Current rules list
GET  /traffic              → Real-time traffic stats (WebSocket)
GET  /logs                 → Log stream (WebSocket)
GET  /version              → Core version info
POST /gc                   → Force garbage collection
```

### Authentication

The API accepts an optional secret (Bearer token) configured in the YAML:
```yaml
secret: "your-dashboard-password"
```

Sent in requests as: `Authorization: Bearer your-dashboard-password`

---

## 12. Comparison: OpenClash vs Clash Verge Rev

Clash Verge Rev (`clash-verge-rev/clash-verge-rev`) is a Tauri desktop app for the same
Clash engine. Understanding the differences clarifies what OpenClash uniquely needs to do.

| Aspect | OpenClash (Router) | Clash Verge Rev (Desktop) |
|--------|--------------------|---------------------------|
| **Traffic scope** | ALL LAN devices | Single device only |
| **Interception** | Kernel netfilter (nftables/iptables) | OS system proxy or TUN auto-route |
| **DNS** | Hijacks dnsmasq, affects all devices | Clash TUN hijacks local DNS only |
| **Transparency** | 100% transparent to devices | System proxy: only cooperative apps |
| **Firewall rules** | Manually set up by shell scripts | Clash handles via `auto-route` |
| **China bypass** | nftables IP sets + chnroute lists | GEOIP rules in Clash YAML |
| **Process mgmt** | OpenWrt procd | Tauri Rust backend |
| **Config format** | Same Clash YAML | Same Clash YAML |
| **REST API** | Same Clash API at :9090 | Same Clash API at :9097 |
| **Dashboard** | External (Zashboard/yacd) | Built into app + external |

**The YAML config and REST API are identical.** Only the surrounding infrastructure differs.

### What Verge Does That OpenClash Cannot Copy

- System proxy management (OS-level proxy settings) — meaningless on a router
- Per-app proxy rules (Process rules) — no individual "apps" on router
- Windows Service for TUN privilege — different OS
- Auto-update via app store — OpenWrt uses opkg

### What OpenClash Does That Verge Does Not

- Transparent proxy for ALL LAN devices without device configuration
- Full network-stack traffic interception (every packet, every app, every device)
- DNS hijacking for entire network
- Per-device proxy rules via IP/MAC address
- China IP routing tables at network level
- OpenWrt service integration (boot, procd, cron)

---

## 13. The Clash Dashboard (Zashboard / yacd)

The Clash binary serves a web dashboard at `http://[router-ip]:9090/ui`. OpenClash configures
which dashboard to use and provides a link to it.

**What the dashboard handles (NOT the LuCI app's concern):**
- Live proxy group switching (which server is selected right now)
- Active connections monitor (every TCP/UDP connection through Clash)
- Rules viewer (what routing rules are loaded)
- Real-time traffic graph
- Clash core logs
- Proxy latency testing

**Available dashboards:**
- **Zashboard** — Modern, feature-rich, recommended
- **MetaCubeXD** — Feature-rich, Mihomo-specific features
- **yacd** — Classic, lightweight
- **Custom** — User-provided dashboard URL

**This is a critical architectural separation:** The LuCI app is a *configuration and management*
tool. The Clash dashboard is the *runtime monitoring and control* tool. They do not overlap.

---

## 14. Current Pain Points

### Code Quality

| Problem | Detail |
|---------|--------|
| **Monolithic scripts** | `init.d/openclash` is 3,881 lines of undifferentiated shell |
| **Chinese everywhere** | All comments, variable names, UI labels in Chinese |
| **Mixed paradigms** | Shell + Lua + Ruby for YAML parsing — 3 languages doing 1 job |
| **Duplicated logic** | iptables and nftables code duplicated for the same rules |
| **Implicit dependencies** | Scripts assume specific file paths and binaries without validation |
| **No error handling** | Scripts rely on exit codes and log files, no structured error handling |

### UX Problems

| Problem | Detail |
|---------|--------|
| **15-tab settings page** | All settings weighted equally regardless of importance |
| **No mental model** | Router Integration settings mixed with Clash Config settings |
| **No setup wizard** | New users face 100 settings with no guidance |
| **No progressive disclosure** | Advanced and basic settings presented identically |
| **Dashboard buried** | Link to Clash dashboard is hard to find |
| **No plain-English explanations** | Settings have no descriptions |

### Performance Concerns

| Problem | Detail |
|---------|--------|
| **Hundreds of `uci get` calls** | Each setting read separately; should batch with `config_load` |
| **Sequential nftables rules** | Applied one at a time; should use `nft -f` batch transactions |
| **YAML via Ruby** | Ruby interpreter launched for YAML parsing; should use native tools |
| **iptables dead code** | All modern GL.iNet routers use nftables; iptables code never runs |

---

## 15. Proposed New Architecture

### Guiding Principles

1. **Separation of concerns** — Router integration code is separate from Clash config management
2. **English first** — All code, comments, and UI in English
3. **Progressive complexity** — Simple defaults, advanced options discoverable but not forced
4. **Minimal overlap with dashboard** — The Clash dashboard handles runtime; the LuCI app handles setup
5. **Modern OpenWrt only** — Target OpenWrt 22+ with nftables, drop iptables entirely
6. **Modular shell scripts** — Each concern is its own testable, readable script

### Proposed Shell Script Modules (Network Layer Rewrite)

```
/usr/share/openclash/
├── core/
│   ├── lifecycle.sh      # start, stop, restart, status, watchdog
│   ├── firewall.sh       # all nftables rule creation/deletion
│   ├── dns.sh            # dnsmasq configuration and restoration
│   ├── routing.sh        # ip rule/route for TPROXY
│   └── config.sh         # UCI config reading (batched)
├── update/
│   ├── core.sh           # Clash binary download and update
│   ├── subscriptions.sh  # Subscription URL fetching
│   ├── geoip.sh          # GeoIP database updates
│   ├── rules.sh          # Rule provider updates
│   └── chnroute.sh       # China route list updates
└── util/
    ├── log.sh            # Logging utilities
    ├── yaml.sh           # YAML read/write (without Ruby)
    └── network.sh        # Network utility functions
```

### Proposed LuCI UI Structure (UI Rewrite)

**4 pages, no overlap with Clash dashboard:**

```
Status    →  Running status, quick controls, link to dashboard
Profiles  →  Subscriptions + config file management
Settings  →  Router Integration (tab) + Clash Config (tab)
System    →  Core updates, schedules, logs, diagnostics
```

**Settings page breakdown:**

*Router Integration tab:*
- Operation mode (fake-ip / redir-host / TUN) — with recommendation hint
- DNS hijacking method
- China traffic handling (bypass / proxy / disabled)
- LAN device control (all / blacklist / whitelist)
- Advanced: UDP proxy, common ports, custom bypass lists

*Clash Config tab:*
- Active proxy groups (from loaded config)
- Streaming unlock configuration
- Config overwrite YAML
- Advanced: custom proxy servers, rule providers

**Technology direction (TBD):** The UI rewrite is a separate milestone. Technology choices
(plain LuCI Lua, custom SPA with htmx, React via LuCI's JS framework) are still being evaluated.

---

*Document status: Living document — updated as design decisions are made.*
*Last updated: March 2026*
