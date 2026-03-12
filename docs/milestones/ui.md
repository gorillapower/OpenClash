# Milestone: UI Rewrite — Clash Nivo (LuCI App)

**Product name:** Clash Nivo (repo stays `gorillapowerOpenClash` for now)  
**Status:** Design in progress  
**Depends on:** Network Layer Rewrite (can run partially in parallel)  
**Tech stack:** Svelte 5 + Vite + shadcn-svelte + Tailwind CSS v4 + TanStack Query

---

## Design Philosophy

> **Purposeful minimalism.** Every button, card, and setting must earn its place.
> No "nice to haves" — only things that are beautiful to use.
> Question everything: does this need to exist? What problem does it solve?
> The result should feel simple, aesthetic, and super intuitive.

---

## Goal

Redesign the OpenClash LuCI plugin from scratch to be:
- **Intuitive** — a new user can get up and running in under 5 minutes
- **English-first** — all labels, tooltips, and help text in English
- **Focused** — does configuration and management only; does not duplicate the Clash dashboard
- **Organised** — clear separation between Network settings and Clash Config settings
- **Minimal** — only features that serve a clear purpose; no clutter

---

## Critical Distinction: Configuration Tool vs Dashboard

**This LuCI app is a configuration and management tool. It is NOT a dashboard.**

The Clash binary serves Zashboard at `http://[router-ip]:9090/ui`. That dashboard handles:
- Live proxy group switching
- Active connections monitor
- Rules viewer
- Real-time traffic stats
- Clash core logs
- Proxy latency testing

**We do not rebuild any of that.** The LuCI app links to Zashboard prominently.
One dashboard. One button. No dashboard picker or installer UI.

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

---

## The Two-Layer Settings Model

All settings in this app fall into one of two layers. The UI must make this distinction clear.

**Network** — How traffic flows through the router into Clash:
- Operation mode (fake-ip, redir-host, TUN)
- DNS hijacking method
- LAN device control (whitelist/blacklist by IP/MAC)
- UDP proxy
- *Advanced:* China bypass, IPv6, common ports, QUIC, custom firewall rules, gateway compatible

**Clash Config** — What Clash does once it receives the traffic:
- Custom proxy groups (form + YAML merge)
- Custom rules (YAML merge)
- Config overwrite (YAML snippet merged into active config)
- *Advanced:* Rule providers

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
- **Prominent "Open Dashboard →" button** (links to Zashboard)

**Info cards (always shown when data is available, no visibility toggles):**
- Current external IP + geolocation
- Traffic stats (upload/download)
- Core version and update availability

**First-time state:** If no config is loaded, the Status page shows a clean
inline prompt: "Add your first subscription" with a URL input field and a
"Get Started" button. No wizard. One action, one screen.

### Page 2: Profiles

Everything about getting proxy configs into the system.

**Subscriptions tab:**
- Card grid showing each subscription with: name, expiry date, data remaining, last updated
- "Add Subscription" button → slide-over panel with URL input
- "Update All" button
- Per-card: Update, Edit, Delete actions

**Config Files tab:**
- List of uploaded/downloaded YAML config files
- Active config highlighted
- Switch, Edit (CodeMirror YAML editor), Download, Delete per file
- "Upload Config" button

### Page 3: Settings

All configuration, split into two clear tabs.

**Every setting has:**
- A short inline plain-English description
- An `ⓘ` tooltip icon with detailed explanation (or link to docs page)

**UX pattern:** Simple settings shown inline (toggle/select). Complex settings
open in a **slide-over panel** (Sheet component) from the right — the page
stays visible behind so you don't lose context. No modals.

**Network tab:**

| Section | Settings |
|---------|----------|
| Traffic Mode | Operation mode (fake-ip recommended) ⓘ, UDP proxy toggle ⓘ, TUN stack type ⓘ |
| DNS | Redirect method (dnsmasq / firewall / disabled) ⓘ, flush cache button |
| Device Control | Mode (all / blacklist / whitelist), device list management |
| Advanced ▸ | China bypass ⓘ, common ports ⓘ, router self-proxy ⓘ, QUIC disable ⓘ, IPv6 settings ⓘ, gateway compatible ⓘ, custom firewall rules |

**Clash Config tab:**

| Section | Settings |
|---------|----------|
| Custom Proxy Groups | Simple form: name, type, test URL, proxy filter regex. Appended to subscription config, never replaces. |
| Custom Rules | Simple form: rule type, value, target group. Prepended to subscription rules. |
| Config Overwrite | YAML editor — snippets merged into active config on start. Preview before apply. |
| Advanced ▸ | Rule providers ⓘ, YAML editor for advanced group/rule definitions |

**Proxy Groups — Design rationale:**

The biggest pain point in existing OpenClash was the proxy group editor destroying
subscription configs. Our approach:

1. **Merge, never replace** — Custom groups are *appended* to subscription proxy-groups.
   Custom rules are *prepended* to subscription rules. The subscription YAML is never modified.
2. **Simple form for common cases** — Name, type (select/url-test/fallback/load-balance),
   test URL, interval, proxy filter (regex to select which nodes go in the group).
3. **YAML editor for power users** — Full YAML snippets for complex setups (e.g. AND rules,
   device-specific routing). Accessible via the Advanced section.
4. **Preview** — Show what the merged config will look like before applying.

### Page 4: System

Maintenance and health.

| Section | Content |
|---------|---------|
| Clash Core | Current version, latest available, update button, branch selection |
| Auto Updates | Unified schedule view for all auto-updates (subscriptions, GEO, chnroute) |
| Logs | Service logs + Clash core logs in separate tabs |
| Diagnostics | DNS test, connection test, debug report download |

---

## Feature Triage

Evaluated every feature from OpenClash's ~60+ settings against the design philosophy:
*"Does it have a purpose? Does it need to exist? Is there a reason it's here?"*

### ✅ KEEP — Essential (Tier 1)

| Feature | Page | Purpose |
|---------|------|---------|
| Running status | Status | At-a-glance health |
| Start/Stop/Restart | Status | Primary user action |
| Open Dashboard (Zashboard) | Status | Most-used feature after setup |
| Current config/mode display | Status | Context at a glance |
| Subscription management | Profiles | Core setup workflow |
| Config file switching | Profiles | Core workflow |
| Operation mode | Settings → Network | Core setup |
| DNS redirect method | Settings → Network | Core setup |
| LAN device control | Settings → Network | Who gets proxied |
| Custom proxy groups | Settings → Clash Config | Key user need (merge approach) |
| Config overwrite | Settings → Clash Config | Tweak without editing subscription |
| Core updates | System | Maintenance |
| Auto-update schedules | System | Set-and-forget |
| Logs (service + core) | System | Troubleshooting — both tabs |

### ✅ KEEP — Visible but not prominent (Tier 2)

| Feature | Page | Purpose |
|---------|------|---------|
| UDP proxy toggle | Settings → Network | Setup once |
| Custom rules | Settings → Clash Config | Prepend rules to subscription |

### ✅ KEEP — Advanced, collapsed (Tier 3)

| Feature | Where | Purpose |
|---------|-------|---------|
| China bypass | Network → Advanced | Performance for China users |
| IPv6 settings | Network → Advanced | Setup when needed |
| Common ports | Network → Advanced | Edge case optimization |
| QUIC disable | Network → Advanced | Force HTTPS fallback |
| Router self-proxy | Network → Advanced | Router's own traffic routing |
| Gateway compatible | Network → Advanced | Escape hatch for routing edge cases |
| Custom firewall rules | Network → Advanced | Power users |
| Rule providers | Clash Config → Advanced | External rule files |
| YAML group/rule editor | Clash Config → Advanced | Power user alternative to forms |

### ❌ DROPPED — Failed the purpose test

| Feature | Why dropped |
|---------|-------------|
| Streaming Unlock | Convenience automation. Switch nodes manually in Zashboard. |
| Smart/ML proxy groups | Over-engineered. url-test picks fastest node reliably. |
| Dashboard switcher | Zashboard only. One dashboard, one button. |
| Dler Cloud integration | Service-specific, too niche. |
| Small flash mode | Handle in installation docs, not runtime UI. |
| Game rules | Niche. Achievable via custom rules. |
| Multiple dashboard install/switch | Zashboard only. |

---

## Technology Stack

**Decision: Svelte SPA (served as LuCI static asset)**

The current UI uses LuCI's CBI (Configuration Binding Interface) in Lua — this is why the UX
is poor. The rewrite uses a modern frontend stack to achieve a Verge-quality interface.

### Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | [Svelte 5](https://svelte.dev) + [Vite](https://vitejs.dev) | Smallest bundle of any modern framework (~30–50KB vs Vue's ~150KB). Compiles to vanilla JS — no runtime overhead. Syntax is simpler than Vue/React. |
| **Components** | [shadcn-svelte](https://next.shadcn-svelte.com) | Copy-paste components (no library lock-in), built on Tailwind, clean design system |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) | Utility-first, required by shadcn-svelte, excellent for responsive layout |
| **Data fetching** | [TanStack Query for Svelte](https://tanstack.com/query/latest/docs/framework/svelte/overview) | Server state management, caching, polling — same pattern Verge uses with SWR |
| **Routing** | [svelte-routing](https://github.com/EmilTholin/svelte-routing) or SvelteKit | Client-side routing for the 4-page structure |
| **Backend RPC** | LuCI JSON-RPC (Lua) | Thin Lua layer for OpenWrt-specific ops: UCI reads/writes, service control, filesystem |

### Architecture

```
Browser
  └── Svelte SPA (static files served by LuCI at /luci-static/openclash/)
        ├── Clash REST API (http://router:9090) — proxy status, switching, traffic
        └── LuCI JSON-RPC (/cgi-bin/luci/rpc/*) — UCI config, service control, file ops
```

The Svelte app is built with Vite at development time. The output (`dist/`) is committed
into the LuCI package and served as static assets — no Node.js on the router.

### Why not the alternatives

| Option | Verdict |
|--------|---------|
| LuCI CBI (Lua) | Rejected — proven ceiling on UX quality; the existing app demonstrates its limits |
| LuCI htmx | Rejected — better than CBI but still server-rendered fragments; can't match SPA UX |
| Vue SPA | Considered — good choice, but Svelte is smaller and syntax is cleaner |
| LuCI JS framework | Rejected — sparse docs, experimental, limited community |

### Bundle size target

- Total initial load: **< 150KB gzipped** (including all components)
- Router has limited RAM; keeping the bundle small is a real constraint

---

## Interaction Patterns

- **Slide-over panels** (shadcn-svelte `Sheet`) for complex settings — slides in from the
  right, page stays visible behind. No modals.
- **Inline toggles/selects** for simple settings — no extra interaction needed.
- **Collapsible Advanced sections** — collapsed by default, one click to expand. Settings
  are never hidden, just not front-and-centre.
- **Tooltips** — Every setting has an `ⓘ` icon with a plain-English explanation. Could link
  to a hosted docs page for deeper context.

---

## Design Principles

1. **Purposeful minimalism** — Every element earns its place. If it doesn't have a clear
   purpose, it doesn't exist. No "nice to haves."
2. **English first** — No Chinese. All labels in plain English with descriptions.
3. **Sensible defaults** — Fake-IP mode, DNS via dnsmasq. A user who adds a subscription
   and clicks Start should have a working setup. No wizard needed.
4. **Progressive disclosure** — The top-level shows what matters. Advanced options are one
   click deeper, never hidden — just not front-and-centre.
5. **Explain settings** — Every setting has a one-line plain-English description plus a
   tooltip. No more guessing what `bypass_gateway_compatible` means.
6. **Network vs Clash separation** — Settings tabs are clearly labelled so users understand
   why changing "operation mode" has a different nature to changing "proxy groups".
7. **Don't duplicate the dashboard** — If Zashboard does it, we link to Zashboard.
8. **Merge, never replace** — Custom proxy groups and rules are appended/prepended to
   subscription configs. The subscription YAML is never modified directly.

---

## Decisions Log

| # | Decision | Date |
|---|----------|------|
| 1 | Tech stack: Svelte 5 + Vite + shadcn-svelte + Tailwind v4 + TanStack Query | Mar 2026 |
| 2 | Dashboard: Zashboard only — no picker, no installer | Mar 2026 |
| 3 | No setup wizard — smart empty state on Status page instead | Mar 2026 |
| 4 | Settings tab naming: "Network" + "Clash Config" | Mar 2026 |
| 5 | Interaction: slide-over panels, no modals | Mar 2026 |
| 6 | Proxy groups: simple form + YAML editor, merge approach | Mar 2026 |
| 7 | Config Overwrite: single YAML merge editor (not 6-tab form) | Mar 2026 |
| 8 | Dropped: Streaming Unlock, ML groups, Dler Cloud, Game Rules, Small Flash | Mar 2026 |
| 9 | Dropped: card visibility toggles, archive button | Mar 2026 |
| 11 | Product name: "Clash Nivo" (repo stays gorillapowerOpenClash for now) | Mar 2026 |
| 12 | Logs: both service logs + core logs in separate tabs on System page | Mar 2026 |

---

## Open Questions

- [x] ~~**Technology stack**~~ — Svelte 5 + Vite + shadcn-svelte + Tailwind + TanStack Query
- [x] ~~**Scope of Clash Config tab**~~ — Custom groups/rules via merge + config overwrite YAML editor
- [x] ~~**Dashboard selection**~~ — Zashboard only
- [x] ~~**Wizard vs no wizard**~~ — No wizard, smart empty state
- [x] ~~**Modal vs alternatives**~~ — Slide-over panels
- [ ] **Mobile UX** — GL.iNet users sometimes configure via phone. How responsive should the layout be?
- [ ] **Internationalisation** — English first, but should we architect for i18n from the start?
- [ ] **Dark mode** — Support it? (shadcn-svelte has built-in light/dark theming, low cost)
- [ ] **Connections/Rules read-only views** — Strictly leave to Zashboard?
- [ ] **Tooltip content** — Host docs internally (GitHub Pages) or inline-only tooltips?

---

*Status: Design in progress — page designs being finalised*  
*Last updated: March 2026*
