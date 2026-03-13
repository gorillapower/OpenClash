import { test, expect, type Route } from '@playwright/test'

const BASE = '/luci-static/clash-nivo/'
const RPC_URL = '**/cgi-bin/luci/rpc/clash-nivo'

// ---------------------------------------------------------------------------
// RPC mock helpers
// ---------------------------------------------------------------------------

type Sub = {
  name: string
  url: string
  lastUpdated?: string
}

/** Build a valid JSON-RPC 2.0 success response */
function rpcOk(id: number, result: unknown) {
  return { jsonrpc: '2.0', id, result }
}

/**
 * Creates a stateful RPC route handler. Each call to `subscription.list`
 * returns the current `subs` snapshot; mutations update it in-place.
 */
function makeRpcHandler(initial: Sub[] = []) {
  let subs: Sub[] = [...initial]

  return async (route: Route) => {
    const body = await route.request().postDataJSON() as { id: number; method: string; params: unknown[] }
    const { id, method, params } = body

    switch (method) {
      case 'subscription.list':
        return route.fulfill({ json: rpcOk(id, subs) })

      case 'subscription.add': {
        // params: [token?, url, name?]
        const args = (params as string[]).filter(p => typeof p === 'string' && p !== '')
        const url = args[args.length >= 2 ? args.length - 2 : 0]
        const name = args[args.length - 1] !== url ? args[args.length - 1] : `Sub ${subs.length + 1}`
        const sub: Sub = { name, url, lastUpdated: new Date().toISOString() }
        subs.push(sub)
        return route.fulfill({ json: rpcOk(id, { name }) })
      }

      case 'subscription.edit': {
        // params: [token?, name, data]
        const args = params as unknown[]
        const dataArg = args[args.length - 1] as { url?: string; newName?: string; autoUpdateInterval?: number }
        const nameArg = args[args.length - 2] as string
        subs = subs.map(s =>
          s.name === nameArg ? { ...s, ...(dataArg.url && { url: dataArg.url }), ...(dataArg.newName && { name: dataArg.newName }) } : s
        )
        return route.fulfill({ json: rpcOk(id, null) })
      }

      case 'subscription.delete': {
        const args = params as string[]
        const nameArg = args[args.length - 1]
        subs = subs.filter(s => s.name !== nameArg)
        return route.fulfill({ json: rpcOk(id, null) })
      }

      default:
        return route.fulfill({ json: rpcOk(id, null) })
    }
  }
}

type ConfigF = {
  name: string
  active: boolean
  size?: number
  lastModified?: string
}

/**
 * Creates a stateful RPC handler that covers both subscription and config methods.
 */
function makeFullRpcHandler(initialSubs: Sub[] = [], initialConfigs: ConfigF[] = []) {
  let subs: Sub[] = [...initialSubs]
  let configs: ConfigF[] = [...initialConfigs]

  return async (route: Route) => {
    const body = await route.request().postDataJSON() as { id: number; method: string; params: unknown[] }
    const { id, method, params } = body

    switch (method) {
      // Subscriptions
      case 'subscription.list':
        return route.fulfill({ json: rpcOk(id, subs) })

      case 'subscription.add': {
        const args = (params as string[]).filter(p => typeof p === 'string' && p !== '')
        const url = args[args.length >= 2 ? args.length - 2 : 0]
        const name = args[args.length - 1] !== url ? args[args.length - 1] : `Sub ${subs.length + 1}`
        subs.push({ name, url, lastUpdated: new Date().toISOString() })
        return route.fulfill({ json: rpcOk(id, { name }) })
      }

      case 'subscription.delete': {
        const nameArg = (params as string[])[params.length - 1]
        subs = subs.filter(s => s.name !== nameArg)
        return route.fulfill({ json: rpcOk(id, null) })
      }

      // Configs
      case 'config.list':
        return route.fulfill({ json: rpcOk(id, configs) })

      case 'config.setActive': {
        const nameArg = (params as string[])[params.length - 1]
        configs = configs.map(c => ({ ...c, active: c.name === nameArg }))
        return route.fulfill({ json: rpcOk(id, null) })
      }

      case 'config.delete': {
        const nameArg = (params as string[])[params.length - 1]
        configs = configs.filter(c => c.name !== nameArg)
        return route.fulfill({ json: rpcOk(id, null) })
      }

      case 'config.write': {
        const args = params as unknown[]
        const nameArg = args[args.length - 2] as string
        const exists = configs.some(c => c.name === nameArg)
        if (!exists) {
          configs.push({ name: nameArg, active: false, lastModified: new Date().toISOString() })
        }
        return route.fulfill({ json: rpcOk(id, null) })
      }

      case 'config.read': {
        const nameArg = (params as string[])[params.length - 1]
        return route.fulfill({ json: rpcOk(id, { content: `# ${nameArg}\nproxies: []` }) })
      }

      default:
        return route.fulfill({ json: rpcOk(id, null) })
    }
  }
}

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

// ---------------------------------------------------------------------------
// Lifecycle test — requires RPC mocking
// ---------------------------------------------------------------------------

test.describe('Subscriptions lifecycle', () => {
  test('full add → display → edit → delete lifecycle', async ({ page }) => {
    await page.route(RPC_URL, makeRpcHandler())

    await page.goto(`${BASE}#/profiles`)
    await page.waitForLoadState('networkidle')

    // 1. Empty state shown initially
    await expect(page.getByText(/no subscriptions yet/i)).toBeVisible()

    // 2. Open "Add your first subscription" slide-over from empty state
    await page.getByRole('button', { name: /add your first subscription/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // 3. Fill in URL and name, submit
    await page.getByLabel(/subscription url/i).fill('https://example.com/sub')
    await page.getByLabel(/^name/i).fill('Test VPN')
    await page.getByRole('dialog').locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())

    // 4. Card appears in the grid
    await expect(page.getByText('Test VPN')).toBeVisible()
    await expect(page.getByText(/no subscriptions yet/i)).not.toBeVisible()

    // 5. Open Edit slide-over for the card
    await page.getByRole('button', { name: /edit test vpn/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // 6. Change the name and submit
    const nameInput = page.getByLabel(/^name/i)
    await nameInput.clear()
    await nameInput.fill('Updated VPN')
    await page.getByRole('dialog').locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())

    // 7. Card shows updated name
    await expect(page.getByText('Updated VPN')).toBeVisible()
    await expect(page.getByText('Test VPN')).not.toBeVisible()

    // 8. Delete the card
    await page.getByRole('button', { name: /delete updated vpn/i }).click()
    await page.getByRole('button', { name: /confirm delete/i }).click()

    // 9. Empty state returns
    await expect(page.getByText(/no subscriptions yet/i)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Config Files lifecycle tests
// ---------------------------------------------------------------------------

test.describe('Config Files lifecycle', () => {
  const initialConfigs = [
    { name: 'main.yaml', active: true, size: 2048 },
    { name: 'backup.yaml', active: false, size: 1024 }
  ]

  async function goToConfigs(page: Parameters<Parameters<typeof test>[1]>[0]) {
    await page.route(RPC_URL, makeFullRpcHandler([], initialConfigs))
    await page.goto(`${BASE}#/profiles`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Config Files' }).click()
  }

  test('shows config files with active badge', async ({ page }) => {
    await goToConfigs(page)
    await expect(page.getByText('main.yaml')).toBeVisible()
    await expect(page.getByText('backup.yaml')).toBeVisible()
    await expect(page.getByText('Active')).toBeVisible()
  })

  test('switch config flow: confirm → new config highlighted', async ({ page }) => {
    await goToConfigs(page)

    // 1. backup.yaml has a Switch button
    await page.getByRole('button', { name: /switch to backup\.yaml/i }).click()

    // 2. Inline confirmation appears
    await expect(page.getByRole('button', { name: /confirm switch/i })).toBeVisible()

    // 3. Confirm the switch
    await page.getByRole('button', { name: /confirm switch/i }).click()

    // 4. After switch, backup.yaml shows Active badge
    await expect(page.getByText('Active')).toBeVisible()
    // main.yaml no longer has the switch-disabled state — backup.yaml switch btn is now gone
    await expect(page.getByRole('button', { name: /switch to backup\.yaml/i })).not.toBeVisible()
  })

  test('cancel switch dismisses confirmation', async ({ page }) => {
    await goToConfigs(page)
    await page.getByRole('button', { name: /switch to backup\.yaml/i }).click()
    await expect(page.getByRole('button', { name: /confirm switch/i })).toBeVisible()
    await page.getByRole('button', { name: /cancel switch/i }).click()
    await expect(page.getByRole('button', { name: /confirm switch/i })).not.toBeVisible()
    // Switch button is restored
    await expect(page.getByRole('button', { name: /switch to backup\.yaml/i })).toBeVisible()
  })

  test('delete config flow: confirm → file removed from list', async ({ page }) => {
    await goToConfigs(page)

    await page.getByRole('button', { name: /delete backup\.yaml/i }).click()
    await expect(page.getByRole('button', { name: /confirm delete/i })).toBeVisible()
    await page.getByRole('button', { name: /confirm delete/i }).click()

    await expect(page.getByText('backup.yaml')).not.toBeVisible()
    await expect(page.getByText('main.yaml')).toBeVisible()
  })

  test('upload config flow: file appears in list', async ({ page }) => {
    await page.route(RPC_URL, makeFullRpcHandler())
    await page.goto(`${BASE}#/profiles`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Config Files' }).click()

    // 1. Empty state
    await expect(page.getByText(/no config files yet/i)).toBeVisible()

    // 2. Open Upload slide-over
    await page.getByRole('button', { name: /upload your first config/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // 3. Fill name and simulate file selection by directly injecting content
    await page.getByLabel(/config name/i).fill('new-config')

    // Simulate a file upload via the file input
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.locator('input[type="file"]').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'new-config.yaml',
      mimeType: 'text/yaml',
      buffer: Buffer.from('proxies: []')
    })

    // 4. Submit
    await page.getByRole('dialog').locator('form').evaluate((f: HTMLFormElement) => f.requestSubmit())

    // 5. File appears in the list
    await expect(page.getByText('new-config.yaml')).toBeVisible()
    await expect(page.getByText(/no config files yet/i)).not.toBeVisible()
  })
})
