import { test, expect } from '@playwright/test'

const BASE = '/luci-static/clash-nivo/'

/** Navigate to Sources and open the Add Subscription sheet. */
async function openSheet(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto(`${BASE}#/sources`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Add Subscription' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

test.describe('Sheet (slide-over) component', () => {
  test('sheet slides in from the right', async ({ page }) => {
    await openSheet(page)
    const dialog = page.getByRole('dialog')
    // The panel should be pinned to the right edge
    const box = await dialog.boundingBox()
    const viewport = page.viewportSize()!
    expect(box).not.toBeNull()
    expect(box!.x + box!.width).toBeCloseTo(viewport.width, -1)
  })

  test('backdrop overlay is visible behind the panel', async ({ page }) => {
    await openSheet(page)
    // Backdrop is the aria-hidden fixed overlay behind the dialog
    const backdrop = page.locator('div[aria-hidden="true"]').first()
    await expect(backdrop).toBeVisible()
    // Confirm it covers the full viewport (fixed inset-0)
    const box = await backdrop.boundingBox()
    const viewport = page.viewportSize()!
    expect(box!.width).toBe(viewport.width)
    expect(box!.height).toBe(viewport.height)
  })

  test('sheet takes full width on mobile (375px viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await openSheet(page)
    const dialog = page.getByRole('dialog')
    const box = await dialog.boundingBox()
    expect(box).not.toBeNull()
    // On mobile the sheet should span the full viewport width
    expect(box!.width).toBe(375)
  })
})
