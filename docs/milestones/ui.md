# Milestone: UI Rewrite (LuCI App)

**Status:** Design in progress  
**Depends on:** Network Layer Rewrite (can run partially in parallel)

> ⚠️ This document is a work in progress. Design decisions are still being made.
> See the discussion log for full context.

---

## Goal

Redesign the OpenClash LuCI plugin from scratch to be:
- **Intuitive** — a new user can get up and running in under 5 minutes
- **English-first** — all labels, tooltips, and help text in English
- **Focused** — does configuration and management only; does not duplicate the Clash dashboard
- **Organised** — clear separation between Router Integration settings and Clash Config settings
- **Modern** — clean design, progressive disclosure, sensible defaults

---

## Critical Distinction: Configuration Tool vs Dashboard

**This LuCI app is a configuration and management tool. It is NOT a dashboard.**

The Clash binary already serves a fully-featured web dashboard (Zashboard, MetaCubeXD, yacd)
at `http://[router-ip]:9090/ui`. That dashboard handles:
- Live proxy group switching
- Active connections monitor
- Rules viewer
- Real-time traffic stats
- Clash core logs
- Proxy latency testing

**We do not rebuild any of that.** The LuCI app links to the dashboard prominently.

### What Only the LuCI App Can Do

| Feature | Why it belongs here (not in dashboard) |
|---------|----------------------------------------|
| Operation mode setup | Modifies router nftables/iptables rules |
| DNS hijacking config | Modifies router dnsmasq configuration |
| Subscription management | Downloads files to router filesystem |
| Start / Stop / Restart | Controls OpenWrt procd service |
| Core binary updates | Writes to router filesystem |
| Auto-update scheduling | Manages router cron jobs |
| LAN device control | Modifies router nftables sets |
| China bypass config | Manages router IP sets |

---

## The Two-Layer Settings Model

All settings in this app fall into one of two layers. The UI must make this distinction clear.

**Router Integration** — How traffic flows through the router into Clash:
- Operation mode (fake-ip, redir-host, TUN)
- DNS hijacking method
- China traffic routing
- LAN device control (whitelist/blacklist by IP/MAC)
- UDP proxy
- Common port filtering
- Custom bypass lists
- IPv6 proxy settings

**Clash Configuration** — What Clash does once it receives the traffic:
- Proxy groups and servers (if not using subscriptions)
- Rule providers
- Streaming unlock (per-service proxy selection)
- Config overwrite YAML
- Dashboard settings (port, password)
- DNS resolver settings

---

## Proposed Navigation Structure

**4 top-level pages:**

```
┌──────────────────────────────────────────────────────┐
│  Status  │  Profiles  │  Settings  │  System         │
│                                       [Dashboard →]  │
└──────────────────────────────────────────────────────┘
```

### Page 1: Status

The home page. Users land here every time.

**Always visible:**
- Large running/stopped status indicator (● green / ○ red)
- Currently active config name
- Current operation mode (fake-ip / redir-host / TUN) + proxy mode (rule/global/direct)
- Start / Stop / Restart buttons
- **Prominent "Open Dashboard →" button** (links to Clash web UI)

**Optional cards (user can toggle visibility):**
- Current external IP + geolocation
- Traffic stats (upload/download)
- Core version and update availability
- Auto-update schedule status

**First-time state:** If no config is loaded, shows a "Get Started" prompt
leading to the setup wizard.

### Page 2: Profiles

Everything about getting proxy configs into the system.

**Subscriptions tab:**
- Card grid showing each subscription with: name, expiry date, data remaining, last updated
- "Add Subscription" button → URL input modal
- "Update All" button
- Per-card: Update, Edit, Delete actions

**Config Files tab:**
- List of uploaded/downloaded YAML config files
- Active config highlighted
- Switch, Edit (CodeMirror YAML editor), Download, Delete per file
- "Upload Config" button

### Page 3: Settings

All configuration, split into two clear tabs.

**Router Integration tab:**

| Section | Settings |
|---------|----------|
| Traffic Mode | Operation mode (fake-ip recommended), UDP proxy toggle, TUN stack type |
| DNS | Redirect method (dnsmasq / firewall / disabled), flush cache button |
| China Bypass | Bypass mode (bypass domestic / proxy domestic / disabled), custom bypass lists |
| Device Control | Mode (all / blacklist / whitelist), device list management |
| Advanced | Common ports, router self-proxy, QUIC disable, custom firewall rules |

**Clash Config tab:**

| Section | Settings |
|---------|----------|
| Proxy Groups | Create/edit proxy groups (for manual configs) |
| Streaming Unlock | Per-service unlock config (Netflix, Disney+, etc.) |
| Config Overwrite | YAML snippet merged into active config on start |
| Dashboard | Port, password, dashboard version selection |
| Advanced | Rule providers, game rules |

**UX pattern:** Simple settings shown inline (toggle/select). Complex settings open a modal.
This is inspired by Clash Verge Rev's SettingItem pattern — keeps the page uncluttered.

### Page 4: System

Maintenance and health.

| Section | Content |
|---------|---------|
| Clash Core | Current version, latest available, update button, branch selection |
| Auto Updates | Unified schedule view for all auto-updates (subscriptions, rules, GEO, chnroute) |
| Logs | OpenClash service log viewer (not Clash core logs — those are in the dashboard) |
| Diagnostics | DNS test, connection test, debug report download |

---

## First-Time Setup Wizard

New users arriving at an unconfigured OpenClash should be guided through setup:

```
Step 1 of 4 — Add your subscription
  "Paste your subscription URL from your proxy service provider"
  [URL input field]
  [+ Add another URL]
  [Next →]

Step 2 of 4 — Choose operation mode
  ● Fake-IP (Recommended)
    Best performance. Works with all protocols.
  ○ Redir-Host
    Compatible mode. Try this if Fake-IP causes issues.
  ○ TUN Mode
    Advanced. Requires kmod-tun kernel module.
  [← Back] [Next →]

Step 3 of 4 — China traffic
  ● Bypass (go direct — faster for domestic services)
  ○ Proxy everything through your proxy server
  ○ Disabled (don't apply China routing)
  [← Back] [Next →]

Step 4 of 4 — Starting...
  [✓] Subscription downloaded
  [✓] Configuration applied
  [⟳] Starting Clash...
  [✓] Running!

  [Open Dashboard →]
  [Finish]
```

---

## Feature Priority Matrix

Based on analysis of all ~100 OpenClash features:

### Tier 1 — Always visible, top-level UI

| Feature | Page | Notes |
|---------|------|-------|
| Running status | Status | Big, clear, prominent |
| Start/Stop/Restart | Status | Primary actions |
| Open Dashboard link | Status | Most-used feature after setup |
| Current config/mode | Status | At a glance |
| Subscription management | Profiles | Most common setup task |
| Config file switching | Profiles | Regular use |
| Operation mode selection | Settings → Router | Core setup setting |
| China bypass mode | Settings → Router | High-impact setting |

### Tier 2 — Settings page, visible but not prominent

| Feature | Page | Notes |
|---------|------|-------|
| DNS redirect method | Settings → Router | Setup once |
| LAN device control | Settings → Router | Setup once, occasional changes |
| UDP proxy toggle | Settings → Router | Setup once |
| Streaming unlock | Settings → Clash | Frequently adjusted |
| Dashboard port/password | Settings → Clash | Setup once |
| Core update | System | Occasional |
| Auto-update schedules | System | Setup once |

### Tier 3 — Advanced, collapsed by default

| Feature | Where | Notes |
|---------|-------|-------|
| Custom bypass lists | Settings → Router → Advanced | Power users |
| Custom proxy groups | Settings → Clash → Advanced | Users not on subscriptions |
| Rule providers | Settings → Clash → Advanced | Power users |
| Game rules | Settings → Clash → Advanced | Specific use case |
| Config overwrite YAML | Settings → Clash → Advanced | Power users |
| Custom firewall rules | Settings → Router → Advanced | Very advanced |
| IPv6 settings | Settings → Router → Advanced | Setup when needed |
| Dler cloud integration | Settings → Clash → Advanced | Service-specific |

---

## Technology Stack (Decision Pending)

The current UI uses LuCI's CBI (Configuration Binding Interface) framework in Lua.
Options for the rewrite:

| Option | Pros | Cons |
|--------|------|------|
| **LuCI CBI (Lua)** | No new dependencies, standard OpenWrt way | Clunky, hard to do good UX, limited JS |
| **LuCI htmx** | Modern HTML, minimal JS, no build step | Less common in OpenWrt world |
| **Custom SPA (Vue/React)** | Best UX potential, Verge-quality UI | Build toolchain, larger bundle |
| **LuCI JS framework** | LuCI's own JS client framework | Limited documentation, experimental |

> **Decision needed:** This choice significantly affects implementation complexity and the
> quality of UX achievable. Recommendation: evaluate LuCI's JS framework first, fall back
> to a small Vue SPA if it's insufficient.

---

## Design Principles

1. **English first** — No Chinese. All labels in plain English with descriptions.
2. **Sensible defaults** — Fake-IP mode, China bypass on, DNS via dnsmasq. A user who clicks
   through the wizard with defaults should have a working setup.
3. **Progressive disclosure** — The top-level shows what matters. Advanced options are one
   click deeper, never hidden — just not front-and-centre.
4. **Explain settings** — Every setting has a one-line plain-English description. No more
   guessing what `bypass_gateway_compatible` means.
5. **Router vs Clash separation** — Settings tabs are clearly labelled so users understand
   why changing "operation mode" has a different nature to changing "proxy groups".
6. **Don't duplicate the dashboard** — If Zashboard does it, we link to Zashboard.

---

## Open Questions

- [ ] **Technology stack** — LuCI Lua CBI vs custom SPA? (see above)
- [ ] **Mobile UX** — GL.iNet users sometimes configure via phone. How responsive?
- [ ] **Internationalisation** — English first, but should we plan for i18n from the start?
- [ ] **Dark mode** — Should the LuCI app support it? (GL.iNet UI has both)
- [ ] **Scope of Clash Config tab** — How much proxy/group management belongs here vs
      "just use a subscription and configure via the YAML editor"?
- [ ] **Connections/Rules read-only views** — Worth adding lightweight read-only views
      into the LuCI app, or strictly leave to dashboard?

---

*Status: Design in progress — technology stack and detailed page designs still being finalised*  
*Last updated: March 2026*
