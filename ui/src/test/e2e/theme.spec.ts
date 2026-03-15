import { test, expect } from '@playwright/test'

const BASE = '/luci-static/clash-nivo/'

test('toggle button is visible in nav', async ({ page }) => {
  await page.goto(BASE)
  await expect(page.getByTestId('theme-toggle')).toBeVisible()
})

test('clicking toggle switches html class to dark', async ({ page }) => {
  await page.goto(BASE)

  // Ensure we start in light mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('clash-nivo-theme')
  })
  await page.reload()

  const html = page.locator('html')
  await expect(html).not.toHaveClass(/dark/)

  await page.getByTestId('theme-toggle').click()
  await expect(html).toHaveClass(/dark/)
})

test('clicking toggle twice returns to light mode', async ({ page }) => {
  await page.goto(BASE)

  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('clash-nivo-theme')
  })
  await page.reload()

  const html = page.locator('html')
  const btn = page.getByTestId('theme-toggle')

  await btn.click()
  await expect(html).toHaveClass(/dark/)

  await btn.click()
  await expect(html).not.toHaveClass(/dark/)
})

test('theme persists as dark after page reload', async ({ page }) => {
  await page.goto(BASE)

  // Switch to dark
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('clash-nivo-theme')
  })
  await page.reload()
  await page.getByTestId('theme-toggle').click()

  // Verify dark class is set and preference saved
  await expect(page.locator('html')).toHaveClass(/dark/)

  // Reload — should remain dark
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('theme persists as light after page reload', async ({ page }) => {
  await page.goto(BASE)

  // Force dark then switch back to light
  await page.evaluate(() => {
    localStorage.setItem('clash-nivo-theme', 'dark')
  })
  await page.reload()
  await page.getByTestId('theme-toggle').click()

  await expect(page.locator('html')).not.toHaveClass(/dark/)

  await page.reload()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
})

test('sun icon shown when dark, moon icon shown when light', async ({ page }) => {
  await page.goto(BASE)

  // Force light mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('clash-nivo-theme', 'light')
  })
  await page.reload()

  // Light mode → should show moon icon (to switch to dark)
  await expect(page.getByTestId('moon-icon')).toBeVisible()
  await expect(page.getByTestId('sun-icon')).not.toBeVisible()

  await page.getByTestId('theme-toggle').click()

  // Dark mode → should show sun icon (to switch to light)
  await expect(page.getByTestId('sun-icon')).toBeVisible()
  await expect(page.getByTestId('moon-icon')).not.toBeVisible()
})

test('system preference respected when no manual override (dark system)', async ({ page }) => {
  // Emulate a dark-scheme system
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.evaluate(() => localStorage.removeItem('clash-nivo-theme'))
  await page.goto(BASE)

  // Should start dark based on system preference
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('system preference respected when no manual override (light system)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.evaluate(() => localStorage.removeItem('clash-nivo-theme'))
  await page.goto(BASE)

  await expect(page.locator('html')).not.toHaveClass(/dark/)
})
