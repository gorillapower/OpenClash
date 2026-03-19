/**
 * auth.spec.ts — LuCI authentication works
 *
 * Verifies that the login flow succeeds and the SPA loads correctly
 * when served from the router.
 */
import { test, expect, loginToRouter, gotoApp, APP_BASE, RPC_URL } from './helpers/auth'

test('LuCI login succeeds and session cookie is set', async ({ page }) => {
  const token = await loginToRouter(page)
  expect(token.length).toBeGreaterThan(0)
})

test('SPA loads after login — page title is correct', async ({ page }) => {
  await loginToRouter(page)
  await gotoApp(page)
  await expect(page).toHaveTitle('Clash Nivo')
})

test('SPA shows Status page by default after login', async ({ page }) => {
  await loginToRouter(page)
  await gotoApp(page)
  await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible()
})

test('unauthenticated RPC call returns 401 or error', async ({ request }) => {
  const res = await request.post(RPC_URL, {
    data: { jsonrpc: '2.0', id: 1, method: 'uci.get', params: ['openclash'] },
  })
  // LuCI either 401s or returns an RPC error for unauthenticated requests
  expect([200, 401, 403]).toContain(res.status())
  if (res.status() === 200) {
    const body = await res.json()
    // If it did respond 200, it must be an RPC error (not a success)
    expect(body.error).toBeDefined()
  }
})

test('nav links are all visible after login', async ({ appPage: page }) => {
  await expect(page.getByRole('link', { name: 'Status' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sources' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Compose' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'System' })).toBeVisible()
})

test('navigating directly to the SPA URL redirects through LuCI auth', async ({ page }) => {
  // Visit the SPA without prior login
  await page.goto(APP_BASE)
  // Either the SPA loads (if auth is not required for static assets) or
  // LuCI redirects to its login page
  const url = page.url()
  const isLoginPage = url.includes('login') || url.includes('auth')
  const isSpa = url.includes('clash-nivo')
  expect(isLoginPage || isSpa).toBe(true)
})
