import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { Subscription, ConfigFile } from '$lib/api/luci'
import SourcesPage from '../pages/SourcesPage.svelte'

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

vi.mock('$lib/components/YamlEditor.svelte', () => ({
  default: {}
}))

vi.mock('$lib/api/luci', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/api/luci')>()
  return {
    ...actual,
    luciRpc: {
      ...actual.luciRpc,
      configRead: vi.fn().mockImplementation(() => new Promise(() => {}))
    }
  }
})

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

const mockSubs: Subscription[] = [
  {
    name: 'My VPN',
    url: 'https://example.com/sub1',
    autoUpdateInterval: 24,
    lastUpdated: new Date(Date.now() - 3_600_000).toISOString(),
    expiry: new Date(Date.now() + 30 * 24 * 3_600_000).toISOString(),
    dataUsed: 5 * 1024 * 1024 * 1024,
    dataTotal: 100 * 1024 * 1024 * 1024
  },
  {
    name: 'Work Proxy',
    url: 'https://example.com/sub2',
    lastUpdated: new Date(Date.now() - 86_400_000).toISOString()
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

describe('SourcesPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the Sources heading and inventory framing', () => {
    setupMocks()
    render(SourcesPage)
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByText(/manage subscription sources and uploaded yaml sources/i)).toBeInTheDocument()
    expect(screen.getAllByText('Selected source').length).toBeGreaterThan(0)
  })

  it('shows subscription, uploaded source, and selected source summaries', () => {
    setupMocks()
    render(SourcesPage)
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('config.yaml').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/clash nivo composes from one selected source at a time/i)).toBeInTheDocument()
  })

  it('shows the import placeholder on Sources', () => {
    setupMocks()
    render(SourcesPage)
    expect(screen.getByText(/openclash import/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import from openclash/i })).toBeDisabled()
  })

  it('renders subscriptions and uploaded sources sections without profile tabs', () => {
    setupMocks()
    render(SourcesPage)
    expect(screen.getByRole('heading', { name: 'Subscriptions' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Uploaded sources' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Config Files' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Profiles' })).not.toBeInTheDocument()
  })

  it('shows empty state when no subscriptions', () => {
    setupMocks({ subs: [] })
    render(SourcesPage)
    expect(screen.getByText(/no subscriptions yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add your first subscription/i })).toBeInTheDocument()
  })

  it('opens add subscription sheet and validates empty URL', async () => {
    setupMocks()
    render(SourcesPage)
    await fireEvent.click(screen.getByRole('button', { name: /add subscription/i }))
    const form = screen.getByRole('dialog').querySelector('form')!
    await fireEvent.submit(form)
    expect(screen.getByText(/url is required/i)).toBeInTheDocument()
  })

  it('submits a valid subscription URL', async () => {
    const addMutateAsync = vi.fn().mockResolvedValue({ name: 'test' })
    setupMocks({ addMutateAsync })
    render(SourcesPage)
    await fireEvent.click(screen.getByRole('button', { name: /add subscription/i }))
    await fireEvent.input(screen.getByLabelText(/subscription url/i), {
      target: { value: 'https://example.com/sub' }
    })
    const form = screen.getByRole('dialog').querySelector('form')!
    await fireEvent.submit(form)
    await waitFor(() =>
      expect(addMutateAsync).toHaveBeenCalledWith({
        url: 'https://example.com/sub',
        name: undefined
      })
    )
  })

  it('refresh all uses the reset wording and calls mutation', async () => {
    const updateAllMutate = vi.fn()
    setupMocks({ updateAllMutate })
    render(SourcesPage)
    await fireEvent.click(screen.getByRole('button', { name: /refresh all/i }))
    expect(updateAllMutate).toHaveBeenCalledOnce()
  })

  it('shows uploaded sources and marks the selected source', () => {
    setupMocks()
    render(SourcesPage)
    expect(screen.getByText('backup.yaml')).toBeInTheDocument()
    expect(screen.getAllByText(/selected source/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /select source/i })).toBeInTheDocument()
  })

  it('confirms source selection before mutating', async () => {
    const configSetActiveMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ configSetActiveMutateAsync })
    render(SourcesPage)

    await fireEvent.click(screen.getByRole('button', { name: /select source/i }))
    expect(screen.getByText(/use this as the selected source/i)).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: /^select$/i }))
    await waitFor(() => expect(configSetActiveMutateAsync).toHaveBeenCalledWith('backup.yaml'))
  })

  it('opens the advanced YAML editor from uploaded sources', async () => {
    setupMocks()
    render(SourcesPage)
    await fireEvent.click(screen.getAllByRole('button', { name: /advanced yaml edit/i })[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/advanced edit changes the stored source file directly/i)).toBeInTheDocument()
  })

  it('confirms source deletion before mutating', async () => {
    const configDeleteMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ configDeleteMutateAsync })
    render(SourcesPage)

    await fireEvent.click(screen.getAllByRole('button', { name: /delete source/i })[0])
    expect(screen.getByText(/delete this stored source file/i)).toBeInTheDocument()
    await fireEvent.click(screen.getAllByRole('button', { name: /^delete$/i })[0])
    await waitFor(() => expect(configDeleteMutateAsync).toHaveBeenCalledWith('config.yaml'))
  })

  it('upload form rejects empty name', async () => {
    setupMocks()
    render(SourcesPage)
    await fireEvent.click(screen.getByRole('button', { name: /upload config|upload source/i }))
    const form = screen.getByRole('dialog').querySelector('form')!
    await fireEvent.submit(form)
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })
})
