/**
 * service-control.spec.ts — Start / Stop / Restart from Status page
 *
 * Tests the service control buttons on the Status page against the
 * real router. Restores the running state at the end of the suite.
 */
import { test, expect, gotoApp, loginToRouter, RPC_URL } from './helpers/auth'

async function rpc(page: import('@playwright/test').Page, method: string, params: unknown[] = []) {
  const cookies = await page.context().cookies()
  const token   = cookies.find((c) => c.name.startsWith('sysauth'))?.value ?? ''
  const res = await page.request.post(RPC_URL, {
    data: { jsonrpc: '2.0', id: 1, method, params: token ? [token, ...params] : params },
  })
  const body = await res.json()
  return body.result
}

async function waitForServiceState(
  page: import('@playwright/test').Page,
  running: boolean,
  timeoutMs = 30_000
) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const status = await rpc(page, 'service.status', ['openclash'])
    if (status?.running === running) return
    await page.waitForTimeout(1_500)
  }
  throw new Error(`Service did not reach running=${running} within ${timeoutMs}ms`)
}

test.describe('Service control', () => {
  let wasRunning = false

  test.beforeEach(async ({ page }) => {
    await loginToRouter(page)
    const status = await rpc(page, 'service.status', ['openclash'])
    wasRunning = status?.running === true
  })

  test('Stop button stops the service', async ({ appPage: page }) => {
    test.skip(!wasRunning, 'Service is already stopped — cannot test Stop')

    await gotoApp(page)
    await expect(page.getByRole('button', { name: 'Stop' })).toBeEnabled({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Stop' }).click()

    // Optimistic UI should immediately show Stopped
    await expect(page.getByText('Stopped')).toBeVisible({ timeout: 5_000 })

    // Confirm via RPC that the service actually stopped
    await waitForServiceState(page, false)
  })

  test('Start button starts the service', async ({ appPage: page }) => {
    // Ensure service is stopped first
    const status = await rpc(page, 'service.status', ['openclash'])
    if (status?.running) {
      await rpc(page, 'service.stop', ['openclash'])
      await waitForServiceState(page, false)
      await page.reload()
    }

    await gotoApp(page)
    await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Start' }).click()

    await expect(page.getByText('Running')).toBeVisible({ timeout: 5_000 })
    await waitForServiceState(page, true)
  })

  test('Restart button restarts the service', async ({ appPage: page }) => {
    // Ensure service is running
    const status = await rpc(page, 'service.status', ['openclash'])
    if (!status?.running) {
      test.skip(true, 'Service is stopped — Restart only meaningful when running')
    }

    await gotoApp(page)
    await expect(page.getByRole('button', { name: 'Restart' })).toBeEnabled({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Restart' }).click()

    // Service will briefly stop then start — eventually it should be Running
    await waitForServiceState(page, true, 45_000)
    await expect(page.getByText('Running')).toBeVisible({ timeout: 10_000 })
  })

  test.afterEach(async ({ page }) => {
    // Restore original running state
    if (wasRunning) {
      const status = await rpc(page, 'service.status', ['openclash'])
      if (!status?.running) {
        await rpc(page, 'service.start', ['openclash'])
        await waitForServiceState(page, true).catch(() => {})
      }
    }
  })
})
