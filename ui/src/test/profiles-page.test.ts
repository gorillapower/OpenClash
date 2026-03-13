import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { Subscription, ConfigFile } from '$lib/api/luci'
import ProfilesPage from '../pages/ProfilesPage.svelte'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function makeQuery<T>(data: T | undefined, isPending = false) {
  return { data, isPending, isError: false, isSuccess: !isPending } as unknown as CreateQueryResult<T>
}

function makeMutation(mutateAsync = vi.fn().mockResolvedValue(undefined), isPending = false) {
  return {
    isPending,
    isError: false,
    isSuccess: false,
    mutateAsync,
    mutate: vi.fn()
  } as unknown as CreateMutationResult<unknown, unknown, unknown>
}

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Stub YamlEditor so CodeMirror (which uses DOM APIs unavailable in jsdom) doesn't error.
// We also keep configRead pending so the edit slide-over stays in "Loading…" state,
// meaning YamlEditor is never rendered during unit tests.
vi.mock('$lib/api/luci', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/api/luci')>()
  return {
    ...actual,
    luciRpc: {
      ...actual.luciRpc,
      configRead: vi.fn().mockImplementation(() => new Promise(() => {})) // intentionally never resolves
    }
  }
})

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('$lib/queries/luci', () => ({
  useSubscriptions: vi.fn(),
  useSubscriptionAdd: vi.fn(),
  useSubscriptionDelete: vi.fn(),
  useSubscriptionUpdate: vi.fn(),
  useSubscriptionUpdateAll: vi.fn(),
  useSubscriptionEdit: vi.fn(),
  useConfigs: vi.fn(),
  useConfigSetActive: vi.fn(),
  useConfigDelete: vi.fn(),
  useConfigWrite: vi.fn(),
  luciKeys: {
    all: ['luci'],
    subscriptions: ['luci', 'subscriptions'],
    configs: ['luci', 'configs']
  }
}))

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/svelte-query')>()
  return { ...actual, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })) }
})

import {
  useSubscriptions,
  useSubscriptionAdd,
  useSubscriptionDelete,
  useSubscriptionUpdate,
  useSubscriptionUpdateAll,
  useSubscriptionEdit,
  useConfigs,
  useConfigSetActive,
  useConfigDelete,
  useConfigWrite
} from '$lib/queries/luci'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockSubs: Subscription[] = [
  {
    name: 'My VPN',
    url: 'https://example.com/sub1',
    autoUpdateInterval: 24,
    lastUpdated: new Date(Date.now() - 3_600_000).toISOString(), // 1h ago
    expiry: new Date(Date.now() + 30 * 24 * 3_600_000).toISOString(), // 30 days from now
    dataUsed: 5 * 1024 * 1024 * 1024,   // 5 GB
    dataTotal: 100 * 1024 * 1024 * 1024 // 100 GB
  },
  {
    name: 'Work Proxy',
    url: 'https://example.com/sub2',
    lastUpdated: new Date(Date.now() - 86_400_000).toISOString() // 1d ago
  }
]

const mockConfigs: ConfigFile[] = [
  {
    name: 'config.yaml',
    active: true,
    size: 2048,
    lastModified: new Date(Date.now() - 86_400_000).toISOString()
  },
  {
    name: 'backup.yaml',
    active: false,
    size: 1024,
    lastModified: new Date(Date.now() - 7 * 86_400_000).toISOString()
  }
]

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function setupMocks({
  subs = mockSubs,
  configs = mockConfigs,
  isPending = false,
  addMutateAsync = vi.fn().mockResolvedValue({ name: 'My VPN' }),
  deleteMutateAsync = vi.fn().mockResolvedValue(undefined),
  updateMutateAsync = vi.fn().mockResolvedValue(undefined),
  updateAllMutate = vi.fn(),
  editMutateAsync = vi.fn().mockResolvedValue(undefined),
  configSetActiveMutateAsync = vi.fn().mockResolvedValue(undefined),
  configDeleteMutateAsync = vi.fn().mockResolvedValue(undefined),
  configWriteMutateAsync = vi.fn().mockResolvedValue(undefined)
} = {}) {
  vi.mocked(useSubscriptions).mockReturnValue(makeQuery(subs, isPending) as never)
  vi.mocked(useSubscriptionAdd).mockReturnValue(makeMutation(addMutateAsync) as never)
  vi.mocked(useSubscriptionDelete).mockReturnValue(makeMutation(deleteMutateAsync) as never)
  vi.mocked(useSubscriptionUpdate).mockReturnValue(makeMutation(updateMutateAsync) as never)
  vi.mocked(useSubscriptionUpdateAll).mockReturnValue({
    ...makeMutation(vi.fn(), false),
    mutate: updateAllMutate,
    isPending: false
  } as never)
  vi.mocked(useSubscriptionEdit).mockReturnValue(makeMutation(editMutateAsync) as never)
  vi.mocked(useConfigs).mockReturnValue(makeQuery(configs, isPending) as never)
  vi.mocked(useConfigSetActive).mockReturnValue(makeMutation(configSetActiveMutateAsync) as never)
  vi.mocked(useConfigDelete).mockReturnValue(makeMutation(configDeleteMutateAsync) as never)
  vi.mocked(useConfigWrite).mockReturnValue(makeMutation(configWriteMutateAsync) as never)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProfilesPage — Subscriptions tab', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the Profiles heading', () => {
    setupMocks()
    render(ProfilesPage)
    expect(screen.getByRole('heading', { name: 'Profiles' })).toBeInTheDocument()
  })

  it('renders both tab buttons', () => {
    setupMocks()
    render(ProfilesPage)
    expect(screen.getByRole('button', { name: 'Subscriptions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Config Files' })).toBeInTheDocument()
  })

  it('shows Subscriptions tab as active by default', () => {
    setupMocks()
    render(ProfilesPage)
    expect(screen.getByRole('button', { name: 'Subscriptions' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  it('renders correct number of subscription cards', () => {
    setupMocks()
    render(ProfilesPage)
    expect(screen.getByText('My VPN')).toBeInTheDocument()
    expect(screen.getByText('Work Proxy')).toBeInTheDocument()
  })

  it('each card shows subscription name', () => {
    setupMocks()
    render(ProfilesPage)
    for (const sub of mockSubs) {
      expect(screen.getByText(sub.name)).toBeInTheDocument()
    }
  })

  it('shows "Updated" timestamp on a card that has lastUpdated', () => {
    setupMocks()
    render(ProfilesPage)
    // At least one "Updated ... ago" string exists
    expect(screen.getAllByText(/updated/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows expiry info on a card that has expiry', () => {
    setupMocks()
    render(ProfilesPage)
    expect(screen.getByText(/expires in/i)).toBeInTheDocument()
  })

  it('shows data progress section when dataUsed and dataTotal are set', () => {
    setupMocks()
    render(ProfilesPage)
    expect(screen.getByText(/5\.00 GB used/i)).toBeInTheDocument()
  })

  it('shows loading skeleton when isPending', () => {
    setupMocks({ isPending: true, subs: [] })
    render(ProfilesPage)
    // Cards should not be present, skeleton pulse divs should be
    expect(screen.queryByText('My VPN')).not.toBeInTheDocument()
    const { container } = render(ProfilesPage)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows empty state when no subscriptions', () => {
    setupMocks({ subs: [] })
    render(ProfilesPage)
    expect(screen.getByText(/no subscriptions yet/i)).toBeInTheDocument()
  })

  it('"Add Subscription" button opens slide-over', async () => {
    setupMocks()
    render(ProfilesPage)
    const btn = screen.getByRole('button', { name: 'Add Subscription' })
    await fireEvent.click(btn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/subscription url/i)).toBeInTheDocument()
  })

  it('add form rejects empty URL', async () => {
    setupMocks()
    render(ProfilesPage)
    await fireEvent.click(screen.getByRole('button', { name: 'Add Subscription' }))
    // Submit the form directly without entering a URL
    const dialog = screen.getByRole('dialog')
    const form = dialog.querySelector('form')!
    await fireEvent.submit(form)
    expect(screen.getByText(/url is required/i)).toBeInTheDocument()
  })

  it('add form calls RPC with valid URL', async () => {
    const addMutateAsync = vi.fn().mockResolvedValue({ name: 'test' })
    setupMocks({ addMutateAsync })
    render(ProfilesPage)
    await fireEvent.click(screen.getByRole('button', { name: 'Add Subscription' }))
    await fireEvent.input(screen.getByLabelText(/subscription url/i), {
      target: { value: 'https://example.com/sub' }
    })
    const dialog = screen.getByRole('dialog')
    const form = dialog.querySelector('form')!
    await fireEvent.submit(form)
    await waitFor(() => expect(addMutateAsync).toHaveBeenCalledWith({
      url: 'https://example.com/sub',
      name: undefined
    }))
  })

  it('"Update All" button calls mutation', async () => {
    const updateAllMutate = vi.fn()
    setupMocks({ updateAllMutate })
    render(ProfilesPage)
    await fireEvent.click(screen.getByRole('button', { name: /update all/i }))
    expect(updateAllMutate).toHaveBeenCalledOnce()
  })

  it('delete action calls RPC after confirm', async () => {
    const deleteMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ deleteMutateAsync })
    render(ProfilesPage)
    // Click the delete button for the first card (aria-label includes name)
    const deleteBtn = screen.getByRole('button', { name: /delete my vpn/i })
    await fireEvent.click(deleteBtn)
    // Confirm button appears
    const confirmBtn = screen.getByRole('button', { name: /confirm delete/i })
    await fireEvent.click(confirmBtn)
    expect(deleteMutateAsync).toHaveBeenCalledWith('My VPN')
  })

  it('edit button opens edit slide-over pre-filled', async () => {
    setupMocks()
    render(ProfilesPage)
    const editBtn = screen.getByRole('button', { name: /edit my vpn/i })
    await fireEvent.click(editBtn)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    const urlInput = screen.getByLabelText(/subscription url/i)
    expect((urlInput as HTMLInputElement).value).toBe('https://example.com/sub1')
  })

  it('edit form calls RPC on submit', async () => {
    const editMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ editMutateAsync })
    render(ProfilesPage)
    await fireEvent.click(screen.getByRole('button', { name: /edit my vpn/i }))
    const dialog = screen.getByRole('dialog')
    const form = dialog.querySelector('form')!
    await fireEvent.submit(form)
    await waitFor(() =>
      expect(editMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My VPN' })
      )
    )
  })

  it('switching to Config Files tab shows toolbar and list', async () => {
    setupMocks()
    render(ProfilesPage)
    await fireEvent.click(screen.getByRole('button', { name: 'Config Files' }))
    expect(screen.getByRole('button', { name: /upload config/i })).toBeInTheDocument()
  })

  it('per-card update calls mutation with the subscription name', async () => {
    const updateMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ updateMutateAsync })
    render(ProfilesPage)
    const updateBtn = screen.getByRole('button', { name: /update my vpn/i })
    await fireEvent.click(updateBtn)
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledWith('My VPN'))
  })
})

// ---------------------------------------------------------------------------
// Config Files tab tests
// ---------------------------------------------------------------------------

describe('ProfilesPage — Config Files tab', () => {
  beforeEach(() => vi.clearAllMocks())

  async function switchToConfigsTab() {
    render(ProfilesPage)
    await fireEvent.click(screen.getByRole('button', { name: 'Config Files' }))
  }

  it('renders all config files', async () => {
    setupMocks()
    await switchToConfigsTab()
    expect(screen.getByText('config.yaml')).toBeInTheDocument()
    expect(screen.getByText('backup.yaml')).toBeInTheDocument()
  })

  it('active config has "Active" badge', async () => {
    setupMocks()
    await switchToConfigsTab()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('active config row has data-active attribute', async () => {
    setupMocks()
    const { container } = render(ProfilesPage)
    await fireEvent.click(screen.getByRole('button', { name: 'Config Files' }))
    const activeRow = container.querySelector('[data-active="true"]')
    expect(activeRow).not.toBeNull()
    expect(activeRow?.textContent).toContain('config.yaml')
  })

  it('inactive config shows Switch button', async () => {
    setupMocks()
    await switchToConfigsTab()
    expect(screen.getByRole('button', { name: /switch to backup\.yaml/i })).toBeInTheDocument()
  })

  it('active config does not show Switch button', async () => {
    setupMocks()
    await switchToConfigsTab()
    expect(screen.queryByRole('button', { name: /switch to config\.yaml/i })).not.toBeInTheDocument()
  })

  it('switch action shows inline confirmation', async () => {
    setupMocks()
    await switchToConfigsTab()
    await fireEvent.click(screen.getByRole('button', { name: /switch to backup\.yaml/i }))
    expect(screen.getByRole('button', { name: /confirm switch/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel switch/i })).toBeInTheDocument()
  })

  it('confirming switch calls mutation with config name', async () => {
    const configSetActiveMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ configSetActiveMutateAsync })
    await switchToConfigsTab()
    await fireEvent.click(screen.getByRole('button', { name: /switch to backup\.yaml/i }))
    await fireEvent.click(screen.getByRole('button', { name: /confirm switch/i }))
    await waitFor(() => expect(configSetActiveMutateAsync).toHaveBeenCalledWith('backup.yaml'))
  })

  it('cancelling switch hides confirmation', async () => {
    setupMocks()
    await switchToConfigsTab()
    await fireEvent.click(screen.getByRole('button', { name: /switch to backup\.yaml/i }))
    await fireEvent.click(screen.getByRole('button', { name: /cancel switch/i }))
    expect(screen.queryByRole('button', { name: /confirm switch/i })).not.toBeInTheDocument()
  })

  it('delete action shows inline confirmation', async () => {
    setupMocks()
    await switchToConfigsTab()
    await fireEvent.click(screen.getByRole('button', { name: /delete backup\.yaml/i }))
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
  })

  it('confirming delete calls mutation with config name', async () => {
    const configDeleteMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ configDeleteMutateAsync })
    await switchToConfigsTab()
    await fireEvent.click(screen.getByRole('button', { name: /delete backup\.yaml/i }))
    await fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    await waitFor(() => expect(configDeleteMutateAsync).toHaveBeenCalledWith('backup.yaml'))
  })

  it('shows empty state when no configs', async () => {
    setupMocks({ configs: [] })
    await switchToConfigsTab()
    expect(screen.getByText(/no config files yet/i)).toBeInTheDocument()
  })

  it('Upload Config button opens slide-over', async () => {
    setupMocks()
    await switchToConfigsTab()
    await fireEvent.click(screen.getByRole('button', { name: /upload config/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/config name/i)).toBeInTheDocument()
  })

  it('upload form rejects empty name', async () => {
    setupMocks()
    await switchToConfigsTab()
    await fireEvent.click(screen.getByRole('button', { name: /upload config/i }))
    const form = screen.getByRole('dialog').querySelector('form')!
    await fireEvent.submit(form)
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })

  it('edit button opens edit slide-over', async () => {
    setupMocks()
    await switchToConfigsTab()
    await fireEvent.click(screen.getByRole('button', { name: /edit config\.yaml/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog.textContent).toContain('config.yaml')
  })
})

// ---------------------------------------------------------------------------
// luciKeys subscriptions key test (append to queries test coverage)
// ---------------------------------------------------------------------------

describe('luciKeys.subscriptions key', () => {
  it('subscriptions key is an array containing "subscriptions"', async () => {
    const mod = await import('$lib/queries/luci')
    expect(Array.isArray(mod.luciKeys.subscriptions)).toBe(true)
    expect(mod.luciKeys.subscriptions).toContain('subscriptions')
  })
})
