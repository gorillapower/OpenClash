import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

/**
 * Integration test configuration — runs against a real OpenWrt router.
 *
 * Required env vars (set in ui/.env or shell):
 *   ROUTER_URL   — router base URL, e.g. http://10.0.0.1:8080  (default: http://192.168.1.1)
 *   ROUTER_USER  — LuCI username (default: root)
 *   ROUTER_PASS  — LuCI password
 *
 * Optional:
 *   ROUTER_COOKIE — pre-obtained sysauth cookie value; skips the login step
 *   CLASH_URL     — Clash REST API base URL (default: derived from ROUTER_URL on port 9090)
 *   CLASH_SECRET  — Clash API secret
 *
 * Run with:
 *   npm run test:integration
 */

// Load .env from the ui/ directory the same way Vite does
const env = loadEnv('', process.cwd(), '')

// Merge into process.env so spec files and helpers can use process.env as normal
for (const [k, v] of Object.entries(env)) {
  if (!(k in process.env)) process.env[k] = v
}

const ROUTER_URL = process.env.ROUTER_URL ?? process.env.VITE_ROUTER_URL ?? 'http://192.168.1.1'
console.log(ROUTER_URL);
export default defineConfig({
  testDir: './src/test/integration',
  // Run serially — tests share router state (service may be stopped/started)
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // Routers can be slow; give a generous per-test timeout
  timeout: 60_000,
  retries: 2,
  reporter: 'list',
  use: {
    baseURL: ROUTER_URL,
    // Don't navigate to a local dev server — tests open router pages directly
    trace: 'on-first-retry',
    // Accept self-signed certs common on OpenWrt
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer — the router is already running
})
