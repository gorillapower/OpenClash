import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { CoreSourceProbeResult, CoreVersionResult, DashboardOption, InstalledCoreResult, ServiceStatusResult, UpdateStatusResult, UciPackage } from '$lib/api/luci'
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

vi.mock('$lib/queries/luci', () => ({
  useServiceStatus: vi.fn(),
  useServiceCancelJob: vi.fn(),
  useUciConfig: vi.fn(),
  useSetUciConfig: vi.fn(),
  useSetUciConfigBatch: vi.fn(),
  useFlushDnsCache: vi.fn(),
  useFirewallRules: vi.fn(),
  useSetFirewallRules: vi.fn(),
  useCoreCurrent: vi.fn(),
  useCoreLatestVersion: vi.fn(),
  useCoreRefreshLatestVersion: vi.fn(),
  useCoreProbeSources: vi.fn(),
  useCoreUpdateStatus: vi.fn(),
  useCoreUpdate: vi.fn(),
  usePackageLatestVersion: vi.fn(),
  usePackageRefreshLatestVersion: vi.fn(),
  usePackageUpdateStatus: vi.fn(),
  usePackageUpdate: vi.fn(),
  useAssetsUpdateStatus: vi.fn(),
  useAssetsUpdate: vi.fn(),
  useDashboards: vi.fn(),
  useDashboardUpdateStatus: vi.fn(),
  useDashboardUpdate: vi.fn()
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

import {
  useServiceStatus,
  useServiceCancelJob,
  useAssetsUpdate,
  useAssetsUpdateStatus,
  useDashboards,
  useDashboardUpdate,
  useDashboardUpdateStatus,
  useCoreRefreshLatestVersion,
  useCoreProbeSources,
  useCoreLatestVersion,
  useCoreUpdate,
  useCoreUpdateStatus,
  usePackageRefreshLatestVersion,
  usePackageLatestVersion,
  usePackageUpdate,
  usePackageUpdateStatus,
  useFlushDnsCache,
  useFirewallRules,
  useSetFirewallRules,
  useCoreCurrent,
  useSetUciConfig,
  useSetUciConfigBatch,
  useUciConfig
} from '$lib/queries/luci'

function setupMocks({
  serviceStatus = { running: false, busy: false } as ServiceStatusResult,
  uciData = {
    config: {
      cn_port: '9093',
      dashboard_type: 'Official',
      dashboard_forward_ssl: '0'
    }
  } as UciPackage,
  currentVersion = { installed: true, version: '1.18.0', core_type: 'Meta' } as InstalledCoreResult,
  latestCore = {
    version: '1.19.0',
    core_type: 'Meta',
    source_policy: 'auto',
    source_branch: 'master',
    source_base: 'https://raw.githubusercontent.com/vernesong/OpenClash/core'
  } as CoreVersionResult,
  coreStatus = { status: 'idle' } as UpdateStatusResult,
  packageLatest = { version: 'v1.2.3', source_policy: 'package-branch' } as CoreVersionResult,
  packageStatus = { status: 'idle' } as UpdateStatusResult,
  assetsStatus = { status: 'idle' } as UpdateStatusResult,
  dashboards = [
    { id: 'metacubexd', key: 'metacubexd', name: 'MetaCubeXD', label: 'MetaCubeXD', variant: 'Official', installed: true, selected: true, url: 'http://localhost:9093/ui/metacubexd/' },
    { id: 'zashboard', key: 'zashboard', name: 'Zashboard', label: 'Zashboard', variant: 'Official', installed: false, selected: false, url: null }
  ] as DashboardOption[],
  dashboardStatus = { status: 'idle' } as UpdateStatusResult,
  coreUpdateMutate = vi.fn().mockResolvedValue(undefined),
  packageUpdateMutate = vi.fn().mockResolvedValue(undefined),
  assetsUpdateMutate = vi.fn().mockResolvedValue(undefined),
  dashboardUpdateMutate = vi.fn().mockResolvedValue(undefined)
} = {}) {
  vi.mocked(useUciConfig).mockReturnValue(
    makeQueryResult(uciData) as CreateQueryResult<UciPackage>
  )
  vi.mocked(useServiceStatus).mockReturnValue(
    makeQueryResult(serviceStatus) as CreateQueryResult<ServiceStatusResult>
  )
  vi.mocked(useServiceCancelJob).mockReturnValue(
    makeMutationResult() as never
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
  vi.mocked(useCoreCurrent).mockReturnValue(
    makeQueryResult(currentVersion) as CreateQueryResult<InstalledCoreResult>
  )
  vi.mocked(useCoreLatestVersion).mockReturnValue(
    makeQueryResult(latestCore) as CreateQueryResult<CoreVersionResult>
  )
  vi.mocked(useCoreRefreshLatestVersion).mockReturnValue(
    makeMutationResult() as CreateMutationResult<CoreVersionResult, unknown, void, unknown>
  )
  vi.mocked(useCoreProbeSources).mockReturnValue(
    makeMutationResult() as CreateMutationResult<CoreSourceProbeResult, unknown, void, unknown>
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
  vi.mocked(usePackageRefreshLatestVersion).mockReturnValue(
    makeMutationResult() as CreateMutationResult<CoreVersionResult, unknown, void, unknown>
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
  vi.mocked(useDashboards).mockReturnValue(
    makeQueryResult(dashboards) as CreateQueryResult<DashboardOption[]>
  )
  vi.mocked(useDashboardUpdateStatus).mockReturnValue(
    makeQueryResult(dashboardStatus) as CreateQueryResult<UpdateStatusResult>
  )
  vi.mocked(useDashboardUpdate).mockReturnValue(
    makeMutationResult(dashboardUpdateMutate) as CreateMutationResult<UpdateStatusResult, unknown, string, unknown>
  )
}

describe('SystemPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the baseline maintenance sections', () => {
    setupMocks()
    render(SystemPage)

    expect(screen.getByRole('heading', { name: 'System' })).toBeInTheDocument()
    expect(screen.getByText('Clash Core')).toBeInTheDocument()
    expect(screen.getAllByText('Maintenance').length).toBeGreaterThan(0)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getAllByText('Advanced settings').length).toBeGreaterThan(0)
    expect(screen.getByText('Traffic mode')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /how this works/i })).not.toBeInTheDocument()
  })

  it('shows the source selector in the core panel', () => {
    setupMocks({
      latestCore: {
        version: '1.19.0',
        source_policy: 'official',
        source_branch: 'master',
        source_base: 'https://raw.githubusercontent.com/vernesong/OpenClash/core'
      }
    })
    render(SystemPage)

    expect(screen.getByRole('combobox', { name: 'Download source' })).toBeInTheDocument()
    expect(screen.getByText('Clash Core')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('shows current and latest core versions', () => {
    setupMocks({
      currentVersion: { installed: true, version: '1.18.3', core_type: 'Meta' },
      latestCore: { version: '1.19.0', core_type: 'Meta', source_policy: 'auto' }
    })
    render(SystemPage)

    expect(screen.getByText('1.18.3')).toBeInTheDocument()
    expect(screen.getByText('1.19.0')).toBeInTheDocument()
  })

  it('shows install core when no current core is present', () => {
    setupMocks({
      currentVersion: { installed: false, version: null, core_type: 'Meta' },
      latestCore: {
        version: '1.19.0',
        core_type: 'Meta',
        source_policy: 'auto',
        selected_source_label: 'TestingCF jsDelivr',
        source_base: 'https://testingcf.jsdelivr.net/gh/vernesong/OpenClash@core'
      }
    })
    render(SystemPage)

    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument()
    expect(screen.getAllByText('Not installed').length).toBeGreaterThan(0)
    expect(screen.getByText(/Selected: TestingCF jsDelivr/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Download source' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check source' })).toBeInTheDocument()
  })

  it('shows row-level dashboard links from backend-provided urls', () => {
    setupMocks({
      serviceStatus: { running: true, busy: false } as ServiceStatusResult,
      dashboards: [
        { id: 'metacubexd', key: 'metacubexd', name: 'MetaCubeXD', label: 'MetaCubeXD', variant: 'Official', installed: true, selected: true, url: 'https://localhost:9093/ui/metacubexd/?hostname=localhost&port=9093&https=1&secret=abc' },
        { id: 'zashboard', key: 'zashboard', name: 'Zashboard', label: 'Zashboard', variant: 'Official', installed: true, selected: false, url: 'https://localhost:9093/ui/zashboard/?hostname=localhost&port=9093&https=1&secret=abc' }
      ] as DashboardOption[]
    })
    render(SystemPage)

    const openLinks = screen.getAllByRole('link', { name: 'Open' })
    expect(openLinks[0]).toHaveAttribute('href', 'https://localhost:9093/ui/metacubexd/?hostname=localhost&port=9093&https=1&secret=abc')
    expect(openLinks[1]).toHaveAttribute('href', 'https://localhost:9093/ui/zashboard/?hostname=localhost&port=9093&https=1&secret=abc')
    expect(screen.getAllByText('Installed').length).toBeGreaterThan(0)
  })

  it('hides dashboard open links when Clash Nivo is not running', () => {
    setupMocks({
      serviceStatus: { running: false, busy: false } as ServiceStatusResult,
      dashboards: [
        { id: 'metacubexd', key: 'metacubexd', name: 'MetaCubeXD', label: 'MetaCubeXD', variant: 'Official', installed: true, selected: true, url: 'https://localhost:9093/ui/metacubexd/?hostname=localhost&port=9093&https=1&secret=abc' }
      ] as DashboardOption[]
    })
    render(SystemPage)

    expect(screen.queryByRole('link', { name: 'Open' })).not.toBeInTheDocument()
  })

  it('calls core update when the button is clicked', async () => {
    const coreUpdateMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks({ coreUpdateMutate })
    render(SystemPage)

    await fireEvent.click(screen.getAllByRole('button', { name: /^update$/i })[0])
    expect(coreUpdateMutate).toHaveBeenCalledOnce()
  })

  it('calls package update when the button is clicked', async () => {
    const packageUpdateMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks({ packageUpdateMutate })
    render(SystemPage)

    const updateButtons = screen.getAllByRole('button', { name: /^update$/i })
    await fireEvent.click(updateButtons[updateButtons.length - 1])
    expect(packageUpdateMutate).toHaveBeenCalledOnce()
  })

  it('calls asset update when the button is clicked', async () => {
    const assetsUpdateMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks({ assetsUpdateMutate })
    render(SystemPage)

    await fireEvent.click(screen.getByRole('button', { name: /^refresh$/i }))
    expect(assetsUpdateMutate).toHaveBeenCalledOnce()
  })

  it('checks latest versions only on explicit action', async () => {
    const refreshCoreMutate = vi.fn().mockResolvedValue({ version: '1.19.0', status: 'done' })
    const refreshPackageMutate = vi.fn().mockResolvedValue({ version: 'v1.2.3', status: 'done' })
    setupMocks()
    vi.mocked(useCoreRefreshLatestVersion).mockReturnValue(
      makeMutationResult(refreshCoreMutate) as CreateMutationResult<CoreVersionResult, unknown, void, unknown>
    )
    vi.mocked(usePackageRefreshLatestVersion).mockReturnValue(
      makeMutationResult(refreshPackageMutate) as CreateMutationResult<CoreVersionResult, unknown, void, unknown>
    )

    render(SystemPage)

    const buttons = screen.getAllByRole('button', { name: /^check$/i })
    await fireEvent.click(buttons[0])
    await fireEvent.click(buttons[1])

    expect(refreshCoreMutate).toHaveBeenCalledOnce()
    expect(refreshPackageMutate).toHaveBeenCalledOnce()
  })

  it('updates dashboard transport from the dashboard section', async () => {
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

  it('downloads a dashboard option', async () => {
    const dashboardUpdateMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks({ dashboardUpdateMutate })
    render(SystemPage)

    await fireEvent.click(screen.getByRole('button', { name: /^download$/i }))
    expect(dashboardUpdateMutate).toHaveBeenCalledWith('zashboard')
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
      expect(screen.getAllByRole('button', { name: /^updating…$/i }).length).toBeGreaterThanOrEqual(2)
      expect(screen.getByRole('button', { name: /^refreshing…$/i })).toBeDisabled()
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
    vi.mocked(useCoreCurrent).mockReturnValue(
      makeQueryResult({ installed: true, version: '1.18.0', core_type: 'Meta' }) as CreateQueryResult<InstalledCoreResult>
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
