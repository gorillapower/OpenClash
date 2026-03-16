import { test as base, type Page, type BrowserContext } from '@playwright/test'

const ROUTER_URL  = process.env.ROUTER_URL  ?? process.env.VITE_ROUTER_URL  ?? 'http://192.168.1.1'
const ROUTER_USER = process.env.ROUTER_USER ?? 'root'
const ROUTER_PASS = process.env.ROUTER_PASS ?? ''

export const APP_BASE = `${ROUTER_URL}/luci-static/clash-nivo/`
export const RPC_URL  = `${ROUTER_URL}/cgi-bin/luci/rpc/clash-nivo`

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/**
 * Logs into LuCI via the web UI and returns the sysauth cookie value.
 * If ROUTER_COOKIE is set in env, that value is returned immediately
 * without any browser interaction (CI fast path).
 */
export async function loginToRouter(page: Page): Promise<string> {
  const presetCookie = process.env.ROUTER_COOKIE ?? process.env.VITE_ROUTER_COOKIE
  if (presetCookie) {
    // Inject the cookie so requests from this page are authenticated
    await page.context().addCookies([
      {
        name: 'sysauth',
        value: presetCookie,
        domain: new URL(ROUTER_URL).hostname,
        path: '/',
      },
    ])
    return presetCookie
  }

  // Navigate to the LuCI login page
  await page.goto(`${ROUTER_URL}/cgi-bin/luci/`)
  // LuCI renders a form with username + password fields
  await page.getByLabel(/username/i).fill(ROUTER_USER)
  await page.getByLabel(/password/i).fill(ROUTER_PASS)
  await page.getByRole('button', { name: /log in|login/i }).click()
  // Wait until we're past the login page
  await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 15_000 })

  // Extract the sysauth cookie set by LuCI
  const cookies = await page.context().cookies()
  const sysauth = cookies.find((c) => c.name.startsWith('sysauth'))
  return sysauth?.value ?? ''
}

/**
 * Navigates to the Clash Nivo SPA on the router.
 * Assumes the page is already authenticated (call loginToRouter first).
 */
export async function gotoApp(page: Page, hash = '') {
  await page.goto(`${APP_BASE}${hash}`)
  // Wait for the SPA to mount (heading signals the app is ready)
  await page.waitForSelector('h1, h2', { timeout: 20_000 })
}

// ---------------------------------------------------------------------------
// Custom test fixture
// ---------------------------------------------------------------------------

type AuthFixtures = {
  /** An authenticated page pointed at the Clash Nivo SPA root. */
  appPage: Page
  /** The raw authenticated browser context (for constructing additional pages). */
  authContext: BrowserContext
}

/**
 * Drop-in replacement for `test` that automatically logs into the router
 * before each test and navigates to the SPA.
 *
 * Usage:
 *   import { test, expect } from './helpers/auth'
 */
export const test = base.extend<AuthFixtures>({
  appPage: async ({ page }, use) => {
    await loginToRouter(page)
    await gotoApp(page)
    await use(page)
  },

  authContext: async ({ context, page }, use) => {
    await loginToRouter(page)
    await use(context)
  },
})

export { expect } from '@playwright/test'
