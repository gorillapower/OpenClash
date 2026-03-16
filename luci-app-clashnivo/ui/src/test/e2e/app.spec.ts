import { test, expect } from '@playwright/test'

const BASE = '/luci-static/clash-nivo/'

test('page title is correct', async ({ page }) => {
  await page.goto(BASE)
  await expect(page).toHaveTitle('Clash Nivo')
})

test('shows Status page by default', async ({ page }) => {
  await page.goto(BASE)
  await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible()
})

test('nav has 4 links and Dashboard button', async ({ page }) => {
  await page.goto(BASE)
  await expect(page.getByRole('link', { name: 'Status' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Profiles' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'System' })).toBeVisible()
  const dashboard = page.getByRole('link', { name: /open dashboard/i })
  await expect(dashboard).toBeVisible()
  await expect(dashboard).toHaveAttribute('target', '_blank')
})

test('navigate to Profiles via nav', async ({ page }) => {
  await page.goto(BASE)
  await page.getByRole('link', { name: 'Profiles' }).click()
  await expect(page.getByRole('heading', { name: 'Profiles' })).toBeVisible()
  await expect(page).toHaveURL(/#\/profiles/)
})

test('navigate to Settings via nav', async ({ page }) => {
  await page.goto(BASE)
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page).toHaveURL(/#\/settings/)
})

test('navigate to System via nav', async ({ page }) => {
  await page.goto(BASE)
  await page.getByRole('link', { name: 'System' }).click()
  await expect(page.getByRole('heading', { name: 'System' })).toBeVisible()
  await expect(page).toHaveURL(/#\/system/)
})

test('direct URL access to each page', async ({ page }) => {
  const routes: [string, string][] = [
    [`${BASE}#/`, 'Status'],
    [`${BASE}#/profiles`, 'Profiles'],
    [`${BASE}#/settings`, 'Settings'],
    [`${BASE}#/system`, 'System']
  ]
  for (const [url, heading] of routes) {
    await page.goto(url)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  }
})

test('active nav link has aria-current="page"', async ({ page }) => {
  await page.goto(`${BASE}#/settings`)
  const settingsLink = page.getByRole('link', { name: 'Settings' })
  await expect(settingsLink).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Status' })).not.toHaveAttribute('aria-current')
})

test('unknown route falls back to Status', async ({ page }) => {
  await page.goto(`${BASE}#/not-a-real-page`)
  await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible()
})
