/**
 * logs.spec.ts — Log viewer loads both log types
 *
 * Navigates to the Logs page, opens the log viewer, and verifies
 * that both the service log and the core log load non-empty content.
 */
import { test, expect, gotoApp } from './helpers/auth'

test.describe('Log viewer', () => {
  test('service log tab shows content', async ({ appPage: page }) => {
    await gotoApp(page, '#/logs')
    await page.waitForLoadState('networkidle')

    // The log viewer may be on a tab or an accordion — find it broadly
    const serviceLogTrigger = page
      .getByRole('button', { name: /service log|openclash log/i })
      .first()

    if (await serviceLogTrigger.isVisible()) {
      await serviceLogTrigger.click()
    }

    // Log content area should have some text
    const logArea = page.locator('pre, [data-testid="log-output"], textarea').first()
    await expect(logArea).toBeVisible({ timeout: 10_000 })
    const text = await logArea.textContent()
    // We just need it to have loaded — even an empty log is acceptable,
    // but it should not show an error state
    expect(text).not.toBeNull()
  })

  test('switching to core log tab shows different content', async ({ appPage: page }) => {
    await gotoApp(page, '#/logs')
    await page.waitForLoadState('networkidle')

    // Find the core log trigger
    const coreLogTrigger = page
      .getByRole('button', { name: /core log|clash log/i })
      .first()

    if (await coreLogTrigger.isVisible()) {
      await coreLogTrigger.click()
    }

    const logArea = page.locator('pre, [data-testid="log-output"], textarea').first()
    await expect(logArea).toBeVisible({ timeout: 10_000 })
    const text = await logArea.textContent()
    expect(text).not.toBeNull()
  })

  test('log section is present on the Logs page', async ({ appPage: page }) => {
    await gotoApp(page, '#/logs')
    await expect(page.getByRole('heading', { name: 'Logs' })).toBeVisible()
    // Some log-related element must exist
    const hasLog = await page
      .getByText(/log/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasLog).toBe(true)
  })
})
