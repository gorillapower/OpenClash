/**
 * empty-state.spec.ts — First-time empty state → working setup flow
 *
 * Tests the onboarding experience when the router has no subscriptions.
 * Uses RPC to temporarily remove all subscriptions, verifies empty state UI,
 * adds one, then verifies it appears. Restores state after.
 *
 * NOTE: This test temporarily deletes subscriptions. It is safe (they are
 * restored in afterEach) but should not run concurrently with other tests
 * that depend on existing subscriptions. The suite runs serially by design.
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

type Subscription = { name: string; url: string; autoUpdateInterval?: number }

test.describe('Empty state onboarding', () => {
  let savedSubs: Subscription[] = []

  test.beforeEach(async ({ page }) => {
    await loginToRouter(page)
    // Save existing subscriptions so we can restore them
    savedSubs = (await rpc(page, 'subscription.list', [])) ?? []
    // Remove all to simulate empty state
    for (const sub of savedSubs) {
      await rpc(page, 'subscription.delete', [sub.name])
    }
  })

  test('empty state UI is shown when there are no subscriptions', async ({ appPage: page }) => {
    await gotoApp(page, '#/sources')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/no subscriptions yet/i)).toBeVisible({ timeout: 10_000 })
  })

  test('"Add your first subscription" CTA is visible in empty state', async ({ appPage: page }) => {
    await gotoApp(page, '#/sources')
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('button', { name: /add your first subscription/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('adding a subscription from empty state dismisses empty UI and shows card', async ({ appPage: page }) => {
    await gotoApp(page, '#/sources')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /add your first subscription/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const testName = `EmptyStateTest-${Date.now()}`
    await page.getByLabel(/subscription url/i).fill('https://example.com/onboarding-test')
    await page.getByLabel(/^name/i).fill(testName)
    await page.getByRole('dialog').locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())

    await expect(page.getByText(testName)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/no subscriptions yet/i)).not.toBeVisible()

    // Clean up the test subscription
    await rpc(page, 'subscription.delete', [testName])
  })

  test.afterEach(async ({ page }) => {
    // Restore original subscriptions
    for (const sub of savedSubs) {
      const existing: Subscription[] = (await rpc(page, 'subscription.list', [])) ?? []
      if (!existing.find((s) => s.name === sub.name)) {
        await rpc(page, 'subscription.add', [sub.url, sub.name])
      }
    }
  })
})
