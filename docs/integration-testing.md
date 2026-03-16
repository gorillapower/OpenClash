# Integration Testing on OpenWrt Router

Integration tests run the Clash Nivo UI against a real OpenWrt router. They complement the unit tests (Vitest) and mock-based e2e tests (Playwright + mock server) by verifying real UCI config, the Lua RPC backend, and live Clash API responses.

## Prerequisites

- An OpenWrt router with OpenClash installed and the Clash Nivo UI deployed
- The router must be reachable from your dev machine
- Node.js + `npm install` done in `ui/`

## Environment Variables

Set these in your shell or in `ui/.env` before running:

| Variable | Default | Description |
|---|---|---|
| `ROUTER_URL` | `http://192.168.1.1` | Router base URL |
| `ROUTER_USER` | `root` | LuCI username |
| `ROUTER_PASS` | _(empty)_ | LuCI password |
| `ROUTER_COOKIE` | _(unset)_ | Pre-obtained `sysauth` cookie value; skips the login step (useful in CI) |
| `CLASH_URL` | `{ROUTER_URL}:9090` | Clash REST API base URL |
| `CLASH_SECRET` | _(empty)_ | Clash API secret (if configured in your Clash YAML) |
| `SKIP_CORE_UPDATE` | _(unset)_ | Set to `true` to skip the core-update test (which modifies the router binary) |

### Getting a pre-obtained cookie (CI)

1. Log into LuCI in your browser
2. Open DevTools → Application → Cookies
3. Copy the `sysauth` (or `sysauth_http`) cookie value
4. Set `ROUTER_COOKIE=<value>` in your CI environment

## Running the tests

```sh
cd ui

# Run all integration tests
npm run test:integration

# Run a specific spec file
npx playwright test --config playwright.integration.config.ts src/test/integration/auth.spec.ts

# Run with headed browser (useful for debugging)
npx playwright test --config playwright.integration.config.ts --headed

# Show the HTML report after a run
npx playwright show-report
```

## Test matrix

| Spec file | What it covers |
|---|---|
| `auth.spec.ts` | LuCI login, session cookie, unauthenticated access rejection |
| `rpc.spec.ts` | Every RPC method against real UCI data |
| `clash-api.spec.ts` | Clash REST API (`/version`, `/configs`, `/proxies`, `/connections`) |
| `subscriptions.spec.ts` | Subscription add → edit → delete lifecycle via UI |
| `config-switch.spec.ts` | Config file switch + active badge update |
| `settings-persist.spec.ts` | Settings change persists after page reload |
| `service-control.spec.ts` | Start / Stop / Restart from Status page |
| `logs.spec.ts` | Service log and core log load in the System page |
| `core-update.spec.ts` | Core update triggers and reaches terminal state _(set `SKIP_CORE_UPDATE=true` to skip)_ |
| `empty-state.spec.ts` | Empty state UI → add first subscription onboarding flow |

## Notes

- Tests run **serially** (one at a time) to avoid race conditions on shared router state
- Tests that require a specific precondition (e.g. two config files, Clash running) call `test.skip()` gracefully rather than failing
- Cleanup (`afterEach`) restores router state so tests are safe to re-run
- The `core-update` test modifies the router's Clash binary — skip it in regular CI runs

## Adding a new spec

1. Create `ui/src/test/integration/your-feature.spec.ts`
2. Import the auth fixture: `import { test, expect, gotoApp } from './helpers/auth'`
3. Use `appPage` fixture for tests that need a pre-authenticated SPA page, or call `loginToRouter(page)` manually for raw RPC tests
4. Always clean up any mutations in `test.afterEach`
