/**
 * rpc.spec.ts — All RPC calls succeed with real UCI config
 *
 * Makes every RPC method directly (no UI) to verify the Lua backend
 * is installed, methods are registered, and real UCI data is returned.
 */
import { test, expect, loginToRouter, RPC_URL } from './helpers/auth'

// ---------------------------------------------------------------------------
// Helper — make an authenticated JSON-RPC call
// ---------------------------------------------------------------------------

async function rpc(
  request: Parameters<typeof test>[1] extends (args: infer A, ...rest: unknown[]) => unknown
    ? never
    : never,
  page: import('@playwright/test').Page,
  method: string,
  params: unknown[] = []
) {
  // Extract auth token from cookie
  const cookies = await page.context().cookies()
  const sysauth = cookies.find((c) => c.name.startsWith('sysauth'))
  const token = sysauth?.value ?? ''

  const res = await page.request.post(RPC_URL, {
    data: {
      jsonrpc: '2.0',
      id: 1,
      method,
      params: token ? [token, ...params] : params,
    },
  })
  expect(res.ok()).toBe(true)
  const body = await res.json()
  expect(body.error, `RPC error on ${method}: ${JSON.stringify(body.error)}`).toBeUndefined()
  return body.result
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('uci.get returns openclash UCI package', async ({ page }) => {
  await loginToRouter(page)
  const result = await rpc(null as never, page, 'uci.get', ['openclash'])
  expect(result).toBeTruthy()
  expect(typeof result).toBe('object')
})

test('uci.get config section contains expected fields', async ({ page }) => {
  await loginToRouter(page)
  const pkg = await rpc(null as never, page, 'uci.get', ['openclash'])
  // The 'config' section must exist in a configured installation
  expect(pkg).toHaveProperty('config')
})

test('service.status returns running boolean', async ({ page }) => {
  await loginToRouter(page)
  const result = await rpc(null as never, page, 'service.status', ['openclash'])
  expect(result).toHaveProperty('running')
  expect(typeof result.running).toBe('boolean')
})

test('subscription.list returns an array', async ({ page }) => {
  await loginToRouter(page)
  const result = await rpc(null as never, page, 'subscription.list', [])
  expect(Array.isArray(result)).toBe(true)
})

test('config.list returns an array', async ({ page }) => {
  await loginToRouter(page)
  const result = await rpc(null as never, page, 'config.list', [])
  expect(Array.isArray(result)).toBe(true)
})

test('config.list active entry has correct shape', async ({ page }) => {
  await loginToRouter(page)
  const configs = await rpc(null as never, page, 'config.list', [])
  for (const cfg of configs) {
    expect(cfg).toHaveProperty('name')
    expect(cfg).toHaveProperty('active')
    expect(typeof cfg.name).toBe('string')
    expect(typeof cfg.active).toBe('boolean')
  }
})

test('log.service returns a string', async ({ page }) => {
  await loginToRouter(page)
  const result = await rpc(null as never, page, 'log.service', [50])
  expect(typeof result).toBe('string')
})

test('log.core returns a string', async ({ page }) => {
  await loginToRouter(page)
  const result = await rpc(null as never, page, 'log.core', [50])
  expect(typeof result).toBe('string')
})

test('system.info returns core_version and running fields', async ({ page }) => {
  await loginToRouter(page)
  const result = await rpc(null as never, page, 'system.info', [])
  expect(result).toHaveProperty('core_version')
  expect(result).toHaveProperty('running')
})

test('core.latestVersion returns a version string', async ({ page }) => {
  await loginToRouter(page)
  const result = await rpc(null as never, page, 'core.latestVersion', [])
  expect(result).toHaveProperty('version')
  expect(typeof result.version).toBe('string')
})

test('core.updateStatus returns a valid status', async ({ page }) => {
  await loginToRouter(page)
  const result = await rpc(null as never, page, 'core.updateStatus', [])
  expect(result).toHaveProperty('status')
  expect(['idle', 'downloading', 'installing', 'done', 'error']).toContain(result.status)
})

test('unknown method returns JSON-RPC error -32601', async ({ page }) => {
  await loginToRouter(page)
  const cookies = await page.context().cookies()
  const token = cookies.find((c) => c.name.startsWith('sysauth'))?.value ?? ''
  const res = await page.request.post(RPC_URL, {
    data: { jsonrpc: '2.0', id: 99, method: 'nonexistent.method', params: [token] },
  })
  const body = await res.json()
  expect(body.error).toBeDefined()
  expect(body.error.code).toBe(-32601)
})
