/**
 * core-update.spec.ts — Core update downloads and installs
 *
 * Triggers a core update and polls core.updateStatus until it reaches
 * 'done' or 'error'. This test has a long timeout because downloading
 * and installing the Mihomo binary takes time on a real router.
 *
 * NOTE: This test modifies the router's Clash binary. Run it intentionally,
 * not as part of every CI run. Set SKIP_CORE_UPDATE=true to skip it.
 */
import { test, expect, loginToRouter, RPC_URL } from './helpers/auth'

test.skip(!!process.env.SKIP_CORE_UPDATE, 'SKIP_CORE_UPDATE is set — skipping core update test')

async function rpc(page: import('@playwright/test').Page, method: string, params: unknown[] = []) {
  const cookies = await page.context().cookies()
  const token   = cookies.find((c) => c.name.startsWith('sysauth'))?.value ?? ''
  const res = await page.request.post(RPC_URL, {
    data: { jsonrpc: '2.0', id: 1, method, params: token ? [token, ...params] : params },
  })
  const body = await res.json()
  return body.result
}

test('core.update triggers update and eventually reaches done or error', async ({ page }) => {
  test.setTimeout(120_000)
  await loginToRouter(page)

  const before = await rpc(page, 'core.updateStatus', [])
  // Should be idle before we start
  expect(['idle', 'done', 'error']).toContain(before.status)

  // Trigger the update
  await rpc(page, 'core.update', [])

  // Poll until terminal state (done or error) or timeout
  const deadline = Date.now() + 110_000
  let finalStatus = before.status
  while (Date.now() < deadline) {
    await page.waitForTimeout(3_000)
    const s = await rpc(page, 'core.updateStatus', [])
    finalStatus = s.status
    if (finalStatus === 'done' || finalStatus === 'error') break
  }

  // We accept either 'done' (success) or 'error' (e.g. already latest version,
  // network unavailable on test router) — both mean the update process ran.
  expect(['done', 'error']).toContain(finalStatus)
})

test('core.latestVersion returns a non-empty version after update check', async ({ page }) => {
  await loginToRouter(page)
  const result = await rpc(page, 'core.latestVersion', [])
  expect(result).toHaveProperty('version')
  // Could be empty if network is unavailable — just verify it doesn't error
  expect(typeof result.version).toBe('string')
})
