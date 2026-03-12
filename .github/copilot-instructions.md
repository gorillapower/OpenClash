# Copilot Instructions — OpenClash (gorillapower fork)

## Coding Philosophy

- **Optimise for the 90% case** — simplicity and predictable behaviour over completeness.
- **Progressive disclosure** — the common path should be simple and opinionated; complexity belongs in advanced flows.
- **Constraint-based design** — deliberate limitations over flexible complexity. Don't add configurability to avoid making a decision.
- **UI must be simple, aesthetic, minimal (not bare), and intuitive.** Every button and feature must have a purpose. No "nice to haves" — only things that are beautiful to use.

## Architecture

OpenClash is a Clash/Mihomo proxy client for OpenWrt routers. This fork is an English-oriented rewrite of the upstream Chinese codebase.

**Two-layer model** (the key mental model):

1. **Layer 1 — Router Integration** (`luci-app-openclash/root/`): Shell scripts that set up nftables/iptables, DNS hijacking via dnsmasq, and routing tables so LAN traffic flows through Clash. Clash itself does zero firewall work — the shell scripts do all interception.
2. **Layer 2 — Clash Configuration**: Pure YAML config (`/etc/openclash/*.yaml`) defining proxies, proxy-groups, rules, and DNS. Identical to any Clash GUI. Controlled at runtime via the Clash REST API on port 9090.

**New frontend** (`ui/`): A Svelte 5 + Vite + Tailwind CSS v4 SPA replacing the legacy LuCI Lua interface. Uses shadcn-svelte for components. Talks to the router via proxied requests to `/cgi-bin`, `/rpc`, and `/api`.

**Legacy frontend** (`luci-app-openclash/luasrc/`): The original LuCI Lua views. Being replaced by `ui/`.

Read `docs/architecture.md` first when orienting. Drop into `docs/milestones/ui.md` for frontend/UX decisions or `docs/milestones/network-layer.md` for backend/networking work.

## Build & Dev Commands

All frontend commands run from the `ui/` directory:

```sh
cd ui
npm run dev          # Dev server on :5173, proxies to router
npm run build        # Production build → ui/dist/ (committed)
npm run test         # Unit tests (Vitest + jsdom + Testing Library)
npm run test:e2e     # E2E tests (Playwright, Chromium)
```

Run a single unit test:
```sh
cd ui && npx vitest run src/test/some-file.test.ts
```

Run a single e2e test:
```sh
cd ui && npx playwright test src/test/e2e/some-file.spec.ts
```

Set `VITE_ROUTER_URL` in `ui/.env` to proxy dev requests to your router (default: `http://192.168.1.1`).

The legacy OpenWrt package (`luci-app-openclash/`) is compiled via the OpenWrt SDK — see `README.md` for SDK build instructions.

## Key Conventions

- **Path alias**: `$lib` → `ui/src/lib` (use in imports)
- **Base path**: The SPA is served at `/luci-static/clash-nivo/`
- **Build output committed**: `ui/dist/` is checked into git so the router can serve it directly without a build step
- **Component library**: shadcn-svelte components live in `ui/src/lib/components/ui/`
- **Test setup**: Vitest uses `ui/src/test/setup.ts`; e2e tests live in `ui/src/test/e2e/`
- **Custom Clash rules**: `docs/dev-settings.md` is a Ruby script (run by OpenClash's shell layer) that injects custom proxy-groups, rule-providers, and rules into the Clash YAML at startup

## Styling Conventions

The design system is Tailwind CSS v4 + shadcn-svelte. All colours and radii are defined as CSS custom properties in `ui/src/app.css` and exposed to Tailwind via `@theme inline`.

**Colours — always use theme tokens, never hardcode:**
```
bg-background      text-foreground
bg-card            text-card-foreground
bg-muted           text-muted-foreground
bg-primary         text-primary-foreground
bg-secondary       text-secondary-foreground
bg-destructive     text-destructive-foreground
border-border      ring-ring
```

**Border radius — always use the token-mapped scale:**
```
rounded-sm   rounded-md   rounded-lg   rounded-xl
```
These map to `--radius-sm/md/lg/xl` in the theme, so they stay consistent if the base radius changes.

**Units:**
- Use Tailwind spacing/sizing utilities (`p-4`, `gap-2`, `h-14`, `text-sm`) — they are rem-based automatically.
- In any raw CSS (e.g. `@layer base` or `<style>` blocks), use `rem` for sizes/spacing, `em` for component-relative values. `px` is acceptable only for 1px borders and fixed pixel offsets in `calc()` expressions.

**Adding a new token:**
Add it to `:root` and `@theme inline` in `ui/src/app.css`. Never hardcode a one-off value inline.

**When raw CSS is unavoidable:** keep it minimal — one or two lines in a `<style>` block with a comment explaining why Tailwind couldn't handle it.
