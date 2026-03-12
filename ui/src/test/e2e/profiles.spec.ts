import { test, expect } from '@playwright/test'

const BASE = '/luci-static/clash-nivo/'

test.describe('Profiles page', () => {
  test('navigate to Profiles and see heading', async ({ page }) => {
    await page.goto(`${BASE}#/profiles`)
    await expect(page.getByRole('heading', { name: 'Profiles' })).toBeVisible()
  })

  test('shows Subscriptions and Config Files tabs', async ({ page }) => {
    await page.goto(`${BASE}#/profiles`)
    await expect(page.getByRole('button', { name: 'Subscriptions' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Config Files' })).toBeVisible()
  })

  test('Subscriptions tab is active by default', async ({ page }) => {
    await page.goto(`${BASE}#/profiles`)
    const subscriptionsTab = page.getByRole('button', { name: 'Subscriptions' })
    await expect(subscriptionsTab).toHaveAttribute('aria-current', 'page')
  })

  test('Config Files tab switch shows stub content', async ({ page }) => {
    await page.goto(`${BASE}#/profiles`)
    await page.getByRole('button', { name: 'Config Files' }).click()
    await expect(page.getByText(/config files coming soon/i)).toBeVisible()
  })

  test('"Add Subscription" button opens slide-over', async ({ page }) => {
    await page.goto(`${BASE}#/profiles`)
    // Wait for page to settle (empty state or cards)
    await page.waitForLoadState('networkidle')
    const addBtn = page.getByRole('button', { name: 'Add Subscription' }).first()
    await addBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Add Subscription')).toBeVisible()
  })

  test('slide-over closes via X button', async ({ page }) => {
    await page.goto(`${BASE}#/profiles`)
    await page.waitForLoadState('networkidle')
    const addBtn = page.getByRole('button', { name: 'Add Subscription' }).first()
    await addBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: /close/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('slide-over closes via Escape key', async ({ page }) => {
    await page.goto(`${BASE}#/profiles`)
    await page.waitForLoadState('networkidle')
    const addBtn = page.getByRole('button', { name: 'Add Subscription' }).first()
    await addBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('add form shows URL validation error on empty submit', async ({ page }) => {
    await page.goto(`${BASE}#/profiles`)
    await page.waitForLoadState('networkidle')
    const addBtn = page.getByRole('button', { name: 'Add Subscription' }).first()
    await addBtn.click()
    // Submit without entering a URL
    const form = page.getByRole('dialog').locator('form')
    await form.evaluate((f: HTMLFormElement) => f.requestSubmit())
    await expect(page.getByText(/url is required/i)).toBeVisible()
  })

  test('mobile: slide-over is full-width at 375px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`${BASE}#/profiles`)
    await page.waitForLoadState('networkidle')
    const addBtn = page.getByRole('button', { name: 'Add Subscription' }).first()
    await addBtn.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const box = await dialog.boundingBox()
    expect(box?.width).toBeCloseTo(375, -1) // within ~10px of full viewport width
  })
})
