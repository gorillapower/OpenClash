/**
 * subscriptions.spec.ts — Subscription add / update / delete lifecycle
 *
 * Uses the Sources page UI to exercise the full subscription lifecycle
 * on the real router. Creates a test subscription with a recognisable name,
 * exercises edit, then cleans up by deleting it.
 */
import { test, expect, gotoApp } from './helpers/auth'

const TEST_SUB_URL  = 'https://example.com/integration-test-sub'
const TEST_SUB_NAME = `IntegrationTest-${Date.now()}`
const BASE = '#/sources'

test.describe('Subscription lifecycle', () => {
  test('add a new subscription', async ({ appPage: page }) => {
    await gotoApp(page, BASE)
    await page.waitForLoadState('networkidle')

    // Open add dialog — either from empty state or the Add button in the header
    const addBtn = page.getByRole('button', { name: /add.*subscription|add your first/i }).first()
    await addBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByLabel(/subscription url/i).fill(TEST_SUB_URL)
    await page.getByLabel(/^name/i).fill(TEST_SUB_NAME)
    await page.getByRole('dialog').locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())

    // Card should appear
    await expect(page.getByText(TEST_SUB_NAME)).toBeVisible({ timeout: 15_000 })
  })

  test('edit the subscription name', async ({ appPage: page }) => {
    await gotoApp(page, BASE)
    await page.waitForLoadState('networkidle')

    // The card must exist from the previous test
    await expect(page.getByText(TEST_SUB_NAME)).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: new RegExp(`edit ${TEST_SUB_NAME}`, 'i') }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const nameInput = page.getByLabel(/^name/i)
    await nameInput.clear()
    await nameInput.fill(`${TEST_SUB_NAME}-edited`)
    await page.getByRole('dialog').locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())

    await expect(page.getByText(`${TEST_SUB_NAME}-edited`)).toBeVisible({ timeout: 10_000 })
  })

  test('delete the subscription', async ({ appPage: page }) => {
    await gotoApp(page, BASE)
    await page.waitForLoadState('networkidle')

    const editedName = `${TEST_SUB_NAME}-edited`
    await expect(page.getByText(editedName)).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: new RegExp(`delete ${editedName}`, 'i') }).click()
    await page.getByRole('button', { name: /confirm delete/i }).click()

    await expect(page.getByText(editedName)).not.toBeVisible({ timeout: 10_000 })
  })
})
