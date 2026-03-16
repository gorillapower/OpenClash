import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { ClashVersion } from '$lib/api/clash'
import type { CoreVersionResult } from '$lib/api/luci'
import SystemPage from '../pages/SystemPage.svelte'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function makeQueryResult<T>(data: T) {
  return { data, isPending: false, isError: false, isSuccess: true } as unknown
}

function makePendingQueryResult() {
  return { data: undefined, isPending: true, isError: false, isSuccess: false } as unknown
}

function makeErrorQueryResult() {
  return { data: undefined, isPending: false, isError: true, isSuccess: false } as unknown
}

function makeMutationResult(mutateAsync = vi.fn().mockResolvedValue(undefined)) {
  return { isPending: false, isError: false, isSuccess: false, mutateAsync } as unknown
}

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('$lib/queries/clash', () => ({
  useClashVersion: vi.fn()
}))

vi.mock('$lib/queries/luci', () => ({
  useCoreLatestVersion: vi.fn(),
  useCoreUpdate: vi.fn(),
  useCoreUpdateStatus: vi.fn(),
  luciKeys: {
    all: ['luci'],
    coreUpdateStatus: ['luci', 'core-update-status']
  }
}))

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/svelte-query')>()
  const pendingQuery = { data: undefined, isPending: true, isError: false, isSuccess: false }
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    // LogsViewer uses createQuery directly — return a pending stub so the component renders
    createQuery: vi.fn(() => pendingQuery),
  }
})

import { useClashVersion } from '$lib/queries/clash'
import { useCoreLatestVersion, useCoreUpdate, useCoreUpdateStatus } from '$lib/queries/luci'

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------

function setupMocks({
  currentVersion = '1.18.0',
  meta = true,
  latestVersion = '1.18.0',
  latestPending = false,
  latestError = false,
  updateMutate = vi.fn().mockResolvedValue(undefined)
} = {}) {
  vi.mocked(useClashVersion).mockReturnValue(
    makeQueryResult({ version: currentVersion, meta }) as CreateQueryResult<ClashVersion>
  )

  if (latestPending) {
    vi.mocked(useCoreLatestVersion).mockReturnValue(
      makePendingQueryResult() as CreateQueryResult<CoreVersionResult>
    )
  } else if (latestError) {
    vi.mocked(useCoreLatestVersion).mockReturnValue(
      makeErrorQueryResult() as CreateQueryResult<CoreVersionResult>
    )
  } else {
    vi.mocked(useCoreLatestVersion).mockReturnValue(
      makeQueryResult({ version: latestVersion }) as CreateQueryResult<CoreVersionResult>
    )
  }

  vi.mocked(useCoreUpdate).mockReturnValue(
    makeMutationResult(updateMutate) as CreateMutationResult<void, unknown, void, unknown>
  )

  vi.mocked(useCoreUpdateStatus).mockReturnValue(
    makeQueryResult({ status: 'idle' }) as CreateQueryResult<{ status: string }>
  )
}

function renderPage() {
  return render(SystemPage)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SystemPage — page structure', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the System heading', () => {
    setupMocks()
    renderPage()
    expect(screen.getByRole('heading', { name: 'System' })).toBeInTheDocument()
  })

  it('renders the Clash Core section', () => {
    setupMocks()
    renderPage()
    expect(screen.getByText('Clash Core')).toBeInTheDocument()
  })
})

describe('SystemPage — current version display', () => {
  beforeEach(() => vi.clearAllMocks())

  it('displays the current Clash core version', () => {
    setupMocks({ currentVersion: '1.18.3' })
    renderPage()
    expect(screen.getByText('1.18.3')).toBeInTheDocument()
  })

  it('shows "Mihomo" label when meta is true', () => {
    setupMocks({ meta: true })
    renderPage()
    expect(screen.getByText('Mihomo')).toBeInTheDocument()
  })

  it('hides "Mihomo" label when meta is false', () => {
    setupMocks({ meta: false })
    renderPage()
    expect(screen.queryByText('Mihomo')).not.toBeInTheDocument()
  })
})

describe('SystemPage — latest version and update badge', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows "Checking…" while latest version is loading', () => {
    setupMocks({ latestPending: true })
    renderPage()
    expect(screen.getByText('Checking…')).toBeInTheDocument()
  })

  it('displays the latest version once loaded', () => {
    setupMocks({ currentVersion: '1.18.0', latestVersion: '1.19.0' })
    renderPage()
    expect(screen.getByText('1.19.0')).toBeInTheDocument()
  })

  it('shows "Update available" badge when latest > current', () => {
    setupMocks({ currentVersion: '1.18.0', latestVersion: '1.19.0' })
    renderPage()
    expect(screen.getByText('Update available')).toBeInTheDocument()
  })

  it('hides update badge when already on latest version', () => {
    setupMocks({ currentVersion: '1.19.0', latestVersion: '1.19.0' })
    renderPage()
    expect(screen.queryByText('Update available')).not.toBeInTheDocument()
  })

  it('hides update badge when current is newer than latest', () => {
    setupMocks({ currentVersion: '1.20.0', latestVersion: '1.19.0' })
    renderPage()
    expect(screen.queryByText('Update available')).not.toBeInTheDocument()
  })

  it('shows dash for latest version on error', () => {
    setupMocks({ latestError: true })
    renderPage()
    // Both current and latest "—" placeholders — check at least one is shown
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })
})

describe('SystemPage — update button', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows update button when update is available', () => {
    setupMocks({ currentVersion: '1.18.0', latestVersion: '1.19.0' })
    renderPage()
    expect(screen.getByRole('button', { name: /update to/i })).toBeInTheDocument()
  })

  it('hides update button when already on latest version', () => {
    setupMocks({ currentVersion: '1.19.0', latestVersion: '1.19.0' })
    renderPage()
    expect(screen.queryByRole('button', { name: /update to/i })).not.toBeInTheDocument()
  })

  it('calls useCoreUpdate mutateAsync when update button is clicked', async () => {
    const updateMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks({ currentVersion: '1.18.0', latestVersion: '1.19.0', updateMutate })
    renderPage()

    await fireEvent.click(screen.getByRole('button', { name: /update to/i }))
    expect(updateMutate).toHaveBeenCalledOnce()
  })

  it('shows "Updating…" and disables the button while mutation is pending', async () => {
    const updateMutate = vi.fn().mockReturnValue(new Promise(() => {}))
    setupMocks({ currentVersion: '1.18.0', latestVersion: '1.19.0', updateMutate })
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /update to/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled()
    })
  })
})
