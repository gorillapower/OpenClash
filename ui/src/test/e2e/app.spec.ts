import { test, expect } from '@playwright/test'

test('page title is correct', async ({ page }) => {
  await page.goto('/luci-static/clash-nivo/')
  await expect(page).toHaveTitle('Clash Nivo')
})

test('page loads and shows product name', async ({ page }) => {
  await page.goto('/luci-static/clash-nivo/')
  await expect(page.getByRole('heading', { name: 'Clash Nivo' })).toBeVisible()
})
