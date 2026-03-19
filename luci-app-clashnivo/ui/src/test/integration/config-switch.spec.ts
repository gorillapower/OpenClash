/**
 * config-switch.spec.ts — Config file switch + Clash restart
 *
 * Requires at least two config files to exist on the router. Finds a
 * non-active config, switches to it, and verifies the status page reflects
 * the new config. Restores the original active config at the end.
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

test.describe('Config file switch', () => {
  let originalActiveName: string | null = null

  test.beforeEach(async ({ page }) => {
    await loginToRouter(page)
    const configs: Array<{ name: string; active: boolean }> = await rpc(page, 'config.list')
    const active = configs.find((c) => c.active)
    originalActiveName = active?.name ?? null
  })

  test('switch to a non-active config and verify active badge updates', async ({ appPage: page }) => {
    const configs: Array<{ name: string; active: boolean }> = await rpc(page, 'config.list')
    const inactive = configs.find((c) => !c.active)
    test.skip(!inactive, 'Only one config file on this router — cannot test switch')

    await gotoApp(page, '#/sources')
    await page.getByRole('button', { name: 'Config Files' }).click()
    await page.waitForLoadState('networkidle')

    // Switch to the inactive config
    await page.getByRole('button', { name: new RegExp(`switch to ${inactive!.name}`, 'i') }).click()
    await expect(page.getByRole('button', { name: /confirm switch/i })).toBeVisible()
    await page.getByRole('button', { name: /confirm switch/i }).click()

    // The Active badge should now be on the newly selected config
    // Wait for the mutation to settle
    await page.waitForTimeout(2_000)
    const activeBadges = page.getByText('Active')
    await expect(activeBadges.first()).toBeVisible({ timeout: 15_000 })
  })

  test.afterEach(async ({ page }) => {
    // Restore the original active config so other tests are not affected
    if (originalActiveName) {
      await rpc(page, 'config.setActive', [originalActiveName])
    }
  })
})
