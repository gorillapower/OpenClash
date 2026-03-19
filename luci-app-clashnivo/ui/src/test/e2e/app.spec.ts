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
  await expect(page.getByRole('link', { name: 'Sources' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Compose' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'System' })).toBeVisible()
  const dashboard = page.getByRole('link', { name: /open dashboard/i })
  await expect(dashboard).toBeVisible()
  await expect(dashboard).toHaveAttribute('target', '_blank')
})

test('navigate to Sources via nav', async ({ page }) => {
  await page.goto(BASE)
  await page.getByRole('link', { name: 'Sources' }).click()
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
  await expect(page).toHaveURL(/#\/sources/)
})

test('navigate to Compose via nav', async ({ page }) => {
  await page.goto(BASE)
  await page.getByRole('link', { name: 'Compose' }).click()
  await expect(page.getByRole('heading', { name: 'Compose' })).toBeVisible()
  await expect(page).toHaveURL(/#\/compose/)
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
    [`${BASE}#/sources`, 'Sources'],
    [`${BASE}#/compose`, 'Compose'],
    [`${BASE}#/system`, 'System']
  ]
  for (const [url, heading] of routes) {
    await page.goto(url)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  }
})

test('active nav link has aria-current="page"', async ({ page }) => {
  await page.goto(`${BASE}#/compose`)
  const composeLink = page.getByRole('link', { name: 'Compose' })
  await expect(composeLink).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Status' })).not.toHaveAttribute('aria-current')
})

test('legacy profile and settings hashes land on the reset pages', async ({ page }) => {
  await page.goto(`${BASE}#/profiles`)
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()

  await page.goto(`${BASE}#/settings`)
  await expect(page.getByRole('heading', { name: 'Compose' })).toBeVisible()
})

test('unknown route falls back to Status', async ({ page }) => {
  await page.goto(`${BASE}#/not-a-real-page`)
  await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible()
})
