/**
 * clash-api.spec.ts — Clash REST API connectivity
 *
 * Verifies the Clash binary is reachable on port 9090 and returns
 * expected data shapes. Tests skip gracefully when Clash is stopped.
 */
import { test, expect, loginToRouter, RPC_URL } from './helpers/auth'

const ROUTER_URL   = process.env.ROUTER_URL   ?? process.env.VITE_ROUTER_URL  ?? 'http://192.168.1.1'
const CLASH_URL    = process.env.CLASH_URL    ?? process.env.CLASH_TARGET     ?? `${new URL(ROUTER_URL).hostname}:9090`
const CLASH_SECRET = process.env.CLASH_SECRET ?? process.env.VITE_CLASH_SECRET ?? ''

function clashHeaders() {
  return CLASH_SECRET ? ({ Authorization: `Bearer ${CLASH_SECRET}` } as Record<string, string>) : undefined
}

async function isClashRunning(page: import('@playwright/test').Page): Promise<boolean> {
  const cookies = await page.context().cookies()
  const token   = cookies.find((c) => c.name.startsWith('sysauth'))?.value ?? ''
  const res = await page.request.post(RPC_URL, {
    data: { jsonrpc: '2.0', id: 1, method: 'service.status', params: [token, 'openclash'] },
  })
  if (!res.ok()) return false
  const body = await res.json()
  return body.result?.running === true
}

test('GET /version returns meta:true', async ({ page }) => {
  await loginToRouter(page)
  test.skip(!(await isClashRunning(page)), 'Clash is not running — skipping Clash API tests')

  const res = await page.request.get(`${CLASH_URL}/version`, { headers: clashHeaders() })
  expect(res.ok()).toBe(true)
  const body = await res.json()
  expect(body).toHaveProperty('version')
  expect(body.meta).toBe(true)
})

test('GET /configs returns expected fields', async ({ page }) => {
  await loginToRouter(page)
  test.skip(!(await isClashRunning(page)), 'Clash is not running')

  const res = await page.request.get(`${CLASH_URL}/configs`, { headers: clashHeaders() })
  expect(res.ok()).toBe(true)
  const body = await res.json()
  expect(body).toHaveProperty('mode')
  expect(['rule', 'global', 'direct']).toContain(body.mode)
  expect(body).toHaveProperty('port')
})

test('GET /proxies returns a proxies object', async ({ page }) => {
  await loginToRouter(page)
  test.skip(!(await isClashRunning(page)), 'Clash is not running')

  const res = await page.request.get(`${CLASH_URL}/proxies`, { headers: clashHeaders() })
  expect(res.ok()).toBe(true)
  const body = await res.json()
  expect(body).toHaveProperty('proxies')
  expect(typeof body.proxies).toBe('object')
})

test('GET /connections returns connection stats', async ({ page }) => {
  await loginToRouter(page)
  test.skip(!(await isClashRunning(page)), 'Clash is not running')

  const res = await page.request.get(`${CLASH_URL}/connections`, { headers: clashHeaders() })
  expect(res.ok()).toBe(true)
  const body = await res.json()
  expect(body).toHaveProperty('downloadTotal')
  expect(body).toHaveProperty('uploadTotal')
})

test('Clash API is unreachable when Clash is stopped', async ({ page }) => {
  await loginToRouter(page)
  const running = await isClashRunning(page)
  test.skip(running, 'Clash is running — skipping stopped-state test')

  const res = await page.request.get(`${CLASH_URL}/version`, {
    headers: clashHeaders(),
    // Short timeout — we expect a connection refusal
    timeout: 5_000,
  }).catch(() => null)

  // Either the request fails entirely or returns a non-2xx status
  if (res) {
    expect(res.ok()).toBe(false)
  }
  // If res is null, the connection was refused — that's also expected
})
