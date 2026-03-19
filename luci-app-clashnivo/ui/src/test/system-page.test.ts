import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { ClashVersion } from '$lib/api/clash'
import type { CoreVersionResult, UpdateStatusResult, UciPackage } from '$lib/api/luci'
import SystemPage from '../pages/SystemPage.svelte'

function makeQueryResult<T>(data: T) {
  return { data, isPending: false, isError: false, isSuccess: true } as unknown
}

function makePendingQueryResult() {
  return { data: undefined, isPending: true, isError: false, isSuccess: false } as unknown
}

function makeMutationResult(mutateAsync = vi.fn().mockResolvedValue(undefined)) {
  return { isPending: false, isError: false, isSuccess: false, mutateAsync } as unknown
}

vi.mock('$lib/queries/clash', () => ({
  useClashVersion: vi.fn()
}))

vi.mock('$lib/queries/luci', () => ({
  useUciConfig: vi.fn(),
  useSetUciConfig: vi.fn(),
  useSetUciConfigBatch: vi.fn(),
  useFlushDnsCache: vi.fn(),
  useFirewallRules: vi.fn(),
  useSetFirewallRules: vi.fn(),
  useCoreLatestVersion: vi.fn(),
  useCoreUpdateStatus: vi.fn(),
  useCoreUpdate: vi.fn(),
  usePackageLatestVersion: vi.fn(),
  usePackageUpdateStatus: vi.fn(),
  usePackageUpdate: vi.fn(),
  useAssetsUpdateStatus: vi.fn(),
  useAssetsUpdate: vi.fn()
}))

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/svelte-query')>()
  const pendingQuery = { data: '', isPending: false, isError: false, isSuccess: true }
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    createQuery: vi.fn(() => pendingQuery)
  }
})

import { useClashVersion } from '$lib/queries/clash'
import {
  useAssetsUpdate,
  useAssetsUpdateStatus,
  useCoreLatestVersion,
  useCoreUpdate,
  useCoreUpdateStatus,
  usePackageLatestVersion,
  usePackageUpdate,
  usePackageUpdateStatus,
  useFlushDnsCache,
  useFirewallRules,
  useSetFirewallRules,
  useSetUciConfig,
  useSetUciConfigBatch,
  useUciConfig
} from '$lib/queries/luci'

function setupMocks({
  uciData = {
    config: {
      dashboard_type: 'Official',
      dashboard_forward_ssl: '0'
    }
  } as UciPackage,
  currentVersion = { version: '1.18.0', meta: true } as ClashVersion,
  latestCore = {
    version: '1.19.0',
    core_type: 'Meta',
    source_policy: 'openclash',
    source_branch: 'master',
    source_base: 'https://raw.githubusercontent.com/vernesong/OpenClash/core'
  } as CoreVersionResult,
  coreStatus = { status: 'idle' } as UpdateStatusResult,
  packageLatest = { version: 'v1.2.3', source_policy: 'package-branch' } as CoreVersionResult,
  packageStatus = { status: 'idle' } as UpdateStatusResult,
  assetsStatus = { status: 'idle' } as UpdateStatusResult,
  coreUpdateMutate = vi.fn().mockResolvedValue(undefined),
  packageUpdateMutate = vi.fn().mockResolvedValue(undefined),
  assetsUpdateMutate = vi.fn().mockResolvedValue(undefined)
} = {}) {
  vi.mocked(useUciConfig).mockReturnValue(
    makeQueryResult(uciData) as CreateQueryResult<UciPackage>
  )
  vi.mocked(useSetUciConfig).mockReturnValue(
    makeMutationResult() as CreateMutationResult<void, unknown, string | string[], unknown>
  )
  vi.mocked(useSetUciConfigBatch).mockReturnValue(
    makeMutationResult() as CreateMutationResult<void, unknown, { option: string; value: string | string[] }[], unknown>
  )
  vi.mocked(useFlushDnsCache).mockReturnValue(
    makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>
  )
  vi.mocked(useFirewallRules).mockReturnValue(
    makeQueryResult({ content: '# existing rules' }) as CreateQueryResult<{ content: string }>
  )
  vi.mocked(useSetFirewallRules).mockReturnValue(
    makeMutationResult() as CreateMutationResult<void, unknown, string, unknown>
  )
  vi.mocked(useClashVersion).mockReturnValue(
    makeQueryResult(currentVersion) as CreateQueryResult<ClashVersion>
  )
  vi.mocked(useCoreLatestVersion).mockReturnValue(
    makeQueryResult(latestCore) as CreateQueryResult<CoreVersionResult>
  )
  vi.mocked(useCoreUpdateStatus).mockReturnValue(
    makeQueryResult(coreStatus) as CreateQueryResult<UpdateStatusResult>
  )
  vi.mocked(useCoreUpdate).mockReturnValue(
    makeMutationResult(coreUpdateMutate) as CreateMutationResult<UpdateStatusResult, unknown, void, unknown>
  )
  vi.mocked(usePackageLatestVersion).mockReturnValue(
    makeQueryResult(packageLatest) as CreateQueryResult<CoreVersionResult>
  )
  vi.mocked(usePackageUpdateStatus).mockReturnValue(
    makeQueryResult(packageStatus) as CreateQueryResult<UpdateStatusResult>
  )
  vi.mocked(usePackageUpdate).mockReturnValue(
    makeMutationResult(packageUpdateMutate) as CreateMutationResult<UpdateStatusResult, unknown, void, unknown>
  )
  vi.mocked(useAssetsUpdateStatus).mockReturnValue(
    makeQueryResult(assetsStatus) as CreateQueryResult<UpdateStatusResult>
  )
  vi.mocked(useAssetsUpdate).mockReturnValue(
    makeMutationResult(assetsUpdateMutate) as CreateMutationResult<UpdateStatusResult, unknown, void, unknown>
  )
}

describe('SystemPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the baseline maintenance sections', () => {
    setupMocks()
    render(SystemPage)

    expect(screen.getByRole('heading', { name: 'System' })).toBeInTheDocument()
    expect(screen.getByText('Core runtime')).toBeInTheDocument()
    expect(screen.getByText('Package update')).toBeInTheDocument()
    expect(screen.getByText('Asset maintenance')).toBeInTheDocument()
    expect(screen.getByText('Dashboard access')).toBeInTheDocument()
    expect(screen.getAllByText('Advanced settings').length).toBeGreaterThan(0)
    expect(screen.getByText('Traffic mode')).toBeInTheDocument()
  })

  it('shows read-only core source policy context', () => {
    setupMocks({
      latestCore: {
        version: '1.19.0',
        source_policy: 'clashnivo',
        source_branch: 'master',
        source_base: 'https://raw.githubusercontent.com/gorillapower/OpenClash/core'
      }
    })
    render(SystemPage)

    expect(screen.getAllByText('Clash Nivo').length).toBeGreaterThan(0)
    expect(screen.getByText(/core source mode is informational here/i)).toBeInTheDocument()
    expect(screen.getByText(/grouped runtime and maintenance controls are available below/i)).toBeInTheDocument()
  })

  it('shows current and latest core versions', () => {
    setupMocks({
      currentVersion: { version: '1.18.3', meta: true },
      latestCore: { version: '1.19.0', core_type: 'Meta', source_policy: 'openclash' }
    })
    render(SystemPage)

    expect(screen.getByText('1.18.3')).toBeInTheDocument()
    expect(screen.getByText('1.19.0')).toBeInTheDocument()
  })

  it('shows dashboard link using configured transport', () => {
    setupMocks({
      uciData: {
        config: {
          dashboard_type: 'Official',
          dashboard_forward_ssl: '1'
        }
      }
    })
    render(SystemPage)

    expect(screen.getByRole('link', { name: /open dashboard/i })).toHaveAttribute('href', 'https://localhost:9090/ui')
  })

  it('calls core update when the button is clicked', async () => {
    const coreUpdateMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks({ coreUpdateMutate })
    render(SystemPage)

    await fireEvent.click(screen.getByRole('button', { name: /update core/i }))
    expect(coreUpdateMutate).toHaveBeenCalledOnce()
  })

  it('calls package update when the button is clicked', async () => {
    const packageUpdateMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks({ packageUpdateMutate })
    render(SystemPage)

    await fireEvent.click(screen.getByRole('button', { name: /update package/i }))
    expect(packageUpdateMutate).toHaveBeenCalledOnce()
  })

  it('calls asset update when the button is clicked', async () => {
    const assetsUpdateMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks({ assetsUpdateMutate })
    render(SystemPage)

    await fireEvent.click(screen.getByRole('button', { name: /update all assets/i }))
    expect(assetsUpdateMutate).toHaveBeenCalledOnce()
  })

  it('updates dashboard transport from the advanced settings section', async () => {
    const dashboardSslMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks()
    vi.mocked(useSetUciConfig).mockImplementation((pkg, section, option) => {
      const mutate =
        option === 'dashboard_forward_ssl'
          ? dashboardSslMutate
          : vi.fn().mockResolvedValue(undefined)
      return makeMutationResult(mutate) as CreateMutationResult<void, unknown, string | string[], unknown>
    })
    render(SystemPage)

    await fireEvent.click(screen.getByRole('switch', { name: /dashboard forwarding ssl/i }))
    expect(dashboardSslMutate).toHaveBeenCalledWith('1')
  })

  it('flushes DNS cache from the advanced settings section', async () => {
    const flushMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks()
    vi.mocked(useFlushDnsCache).mockReturnValue(
      makeMutationResult(flushMutate) as CreateMutationResult<void, unknown, void, unknown>
    )
    render(SystemPage)

    await fireEvent.click(screen.getByRole('button', { name: /^flush$/i }))
    expect(flushMutate).toHaveBeenCalledOnce()
  })

  it('shows running state labels when updates are active', async () => {
    setupMocks({
      coreStatus: { status: 'running' },
      packageStatus: { status: 'accepted' },
      assetsStatus: { status: 'running' }
    })
    render(SystemPage)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /updating core/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /updating package/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /updating assets/i })).toBeDisabled()
    })
  })

  it('shows update status messages when present', () => {
    setupMocks({
      packageStatus: { status: 'error', message: 'Package update failed' },
      assetsStatus: { status: 'nochange', message: 'No asset update required' }
    })
    render(SystemPage)

    expect(screen.getByText('Package update failed')).toBeInTheDocument()
    expect(screen.getByText('No asset update required')).toBeInTheDocument()
  })

  it('shows checking state while latest core version is loading', () => {
    vi.mocked(useUciConfig).mockReturnValue(
      makeQueryResult({ config: { dashboard_type: 'Official', dashboard_forward_ssl: '0' } }) as CreateQueryResult<UciPackage>
    )
    vi.mocked(useSetUciConfig).mockReturnValue(
      makeMutationResult() as CreateMutationResult<void, unknown, string | string[], unknown>
    )
    vi.mocked(useSetUciConfigBatch).mockReturnValue(
      makeMutationResult() as CreateMutationResult<void, unknown, { option: string; value: string | string[] }[], unknown>
    )
    vi.mocked(useClashVersion).mockReturnValue(
      makeQueryResult({ version: '1.18.0', meta: true }) as CreateQueryResult<ClashVersion>
    )
    vi.mocked(useCoreLatestVersion).mockReturnValue(
      makePendingQueryResult() as CreateQueryResult<CoreVersionResult>
    )
    vi.mocked(useCoreUpdateStatus).mockReturnValue(
      makeQueryResult({ status: 'idle' }) as CreateQueryResult<UpdateStatusResult>
    )
    vi.mocked(useCoreUpdate).mockReturnValue(
      makeMutationResult() as CreateMutationResult<UpdateStatusResult, unknown, void, unknown>
    )
    vi.mocked(usePackageLatestVersion).mockReturnValue(
      makeQueryResult({ version: 'v1.2.3' }) as CreateQueryResult<CoreVersionResult>
    )
    vi.mocked(usePackageUpdateStatus).mockReturnValue(
      makeQueryResult({ status: 'idle' }) as CreateQueryResult<UpdateStatusResult>
    )
    vi.mocked(usePackageUpdate).mockReturnValue(
      makeMutationResult() as CreateMutationResult<UpdateStatusResult, unknown, void, unknown>
    )
    vi.mocked(useAssetsUpdateStatus).mockReturnValue(
      makeQueryResult({ status: 'idle' }) as CreateQueryResult<UpdateStatusResult>
    )
    vi.mocked(useAssetsUpdate).mockReturnValue(
      makeMutationResult() as CreateMutationResult<UpdateStatusResult, unknown, void, unknown>
    )

    render(SystemPage)
    expect(screen.getByText('Checking…')).toBeInTheDocument()
  })
})
