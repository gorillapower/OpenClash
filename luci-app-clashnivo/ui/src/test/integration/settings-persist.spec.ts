/**
 * settings-persist.spec.ts — Compose changes persist across page reloads
 *
 * Changes a safe, easily reversible UCI setting (dns_redirect), saves it,
 * reloads the page, and asserts the value was persisted.
 * Restores the original value in afterEach.
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

test.describe('Compose persistence', () => {
  let originalMode: string | null = null

  test.beforeEach(async ({ page }) => {
    await loginToRouter(page)
    const pkg = await rpc(page, 'uci.get', ['openclash'])
    originalMode = (pkg?.config?.operation_mode as string) ?? null
  })

  test('operation mode change persists after page reload', async ({ appPage: page }) => {
    await gotoApp(page, '#/compose')
    await page.waitForLoadState('networkidle')

    // Find the operation mode selector — label text may vary, use a broad selector
    const modeSelect = page.getByLabel(/operation mode/i).first()
    await expect(modeSelect).toBeVisible({ timeout: 10_000 })

    // Pick a mode that is different from the current one
    const targetMode = originalMode === 'fake-ip' ? 'redir-host' : 'fake-ip'
    await modeSelect.selectOption(targetMode)

    // Save / apply the settings
    const saveBtn = page.getByRole('button', { name: /save|apply/i }).first()
    await saveBtn.click()
    await page.waitForLoadState('networkidle')

    // Reload and verify
    await page.reload()
    await page.waitForLoadState('networkidle')

    const modeCurrent = await modeSelect.inputValue().catch(() => null)
    // If the select is not visible post-reload, check via RPC
    if (modeCurrent) {
      expect(modeCurrent).toBe(targetMode)
    } else {
      const pkg = await rpc(page, 'uci.get', ['openclash'])
      expect(pkg?.config?.operation_mode).toBe(targetMode)
    }
  })

  test.afterEach(async ({ page }) => {
    // Restore original mode
    if (originalMode) {
      await rpc(page, 'uci.set', ['openclash', 'config', 'operation_mode', originalMode])
      await rpc(page, 'uci.commit', ['openclash'])
    }
  })
})
