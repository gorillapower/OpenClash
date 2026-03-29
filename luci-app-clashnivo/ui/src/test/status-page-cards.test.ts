import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import type { CreateQueryResult } from '@tanstack/svelte-query'
import type { ServiceStatusResult, UciPackage, FileReadResult } from '$lib/api/luci'
import StatusPage from '../pages/StatusPage.svelte'

function makeQueryResult<T>(data: T) {
  return { data, isPending: false, isError: false, isSuccess: true } as unknown
}

function makeMutationResult(mutateAsync = vi.fn().mockResolvedValue(undefined)) {
  return { isPending: false, isError: false, isSuccess: false, mutateAsync } as unknown
}

vi.mock('$lib/queries/luci', () => ({
  useServiceStatus: vi.fn(),
  useServiceStart: vi.fn(),
  useServiceStop: vi.fn(),
  useServiceRestart: vi.fn(),
  useServiceCancelJob: vi.fn(),
  useCoreCurrent: vi.fn(),
  useCoreLatestVersion: vi.fn(),
  useCoreRefreshLatestVersion: vi.fn(),
  useCoreProbeSources: vi.fn(),
  useCoreUpdate: vi.fn(),
  useCoreUpdateStatus: vi.fn(),
  useSetUciConfigBatch: vi.fn(),
  useUciConfig: vi.fn(),
  useSubscriptionAdd: vi.fn(),
  useSubscriptionUpdate: vi.fn(),
  useProxyGroups: vi.fn(),
  useRuleProviders: vi.fn(),
  useCustomProxies: vi.fn(),
  useCustomRules: vi.fn(),
  useConfigOverwrite: vi.fn(),
  luciKeys: {
    all: ['luci'],
    uci: (pkg: string) => ['luci', 'uci', pkg]
  }
}))

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/svelte-query')>()
  return { ...actual, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn(), refetchQueries: vi.fn() })) }
})

import {
  useServiceStatus,
  useServiceStart,
  useServiceStop,
  useServiceRestart,
  useServiceCancelJob,
  useCoreCurrent,
  useCoreLatestVersion,
  useCoreRefreshLatestVersion,
  useCoreProbeSources,
  useCoreUpdate,
  useCoreUpdateStatus,
  useSetUciConfigBatch,
  useUciConfig,
  useSubscriptionAdd,
  useSubscriptionUpdate,
  useProxyGroups,
  useRuleProviders,
  useCustomProxies,
  useCustomRules,
  useConfigOverwrite
} from '$lib/queries/luci'

function setupMocks(serviceStatus: ServiceStatusResult) {
  vi.mocked(useServiceStatus).mockReturnValue(
    makeQueryResult(serviceStatus) as CreateQueryResult<ServiceStatusResult>
  )
  vi.mocked(useCoreCurrent).mockReturnValue(makeQueryResult({ installed: true, version: '1.18.0', core_type: 'Meta' }) as never)
  vi.mocked(useCoreLatestVersion).mockReturnValue(makeQueryResult({ version: '1.19.0', core_type: 'Meta', source_policy: 'auto' }) as never)
  vi.mocked(useCoreRefreshLatestVersion).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useCoreProbeSources).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useCoreUpdate).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useCoreUpdateStatus).mockReturnValue(makeQueryResult({ status: 'idle' }) as never)
  vi.mocked(useSetUciConfigBatch).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useUciConfig).mockReturnValue(
    makeQueryResult({ config: { config_path: '/etc/clashnivo/config/work.yaml' } }) as CreateQueryResult<UciPackage>
  )
  vi.mocked(useProxyGroups).mockReturnValue(makeQueryResult([]) as never)
  vi.mocked(useRuleProviders).mockReturnValue(makeQueryResult([]) as never)
  vi.mocked(useCustomProxies).mockReturnValue(makeQueryResult([]) as never)
  vi.mocked(useCustomRules).mockReturnValue(makeQueryResult([]) as never)
  vi.mocked(useConfigOverwrite).mockReturnValue(makeQueryResult({ content: '' } satisfies FileReadResult) as never)
  vi.mocked(useServiceStart).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useServiceStop).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useServiceRestart).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useServiceCancelJob).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useSubscriptionAdd).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useSubscriptionUpdate).mockReturnValue(makeMutationResult() as never)
}

describe('StatusPage cards', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows activation as available when not blocked', () => {
    setupMocks({
      running: true,
      state: 'running',
      enabled: true,
      service_running: true,
      core_running: true,
      can_start: true,
      blocked: false,
      active_config: '/etc/clashnivo/config/work.yaml'
    })
    render(StatusPage)

    expect(screen.getByText('Activation')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('shows activation as blocked when guard state is active', () => {
    setupMocks({
      running: false,
      state: 'blocked',
      enabled: true,
      core_running: false,
      can_start: false,
      blocked: true,
      blocked_reason: 'openclash_active',
      openclash_installed: true,
      openclash_active: true,
      active_config: '/etc/clashnivo/config/work.yaml'
    })
    render(StatusPage)

    expect(screen.getAllByText('Blocked').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/openclash is active and currently blocks clash nivo startup/i)).toBeInTheDocument()
  })

  it('shows core health and selected source in the runtime summary', () => {
    setupMocks({
      running: true,
      state: 'running',
      enabled: true,
      service_running: true,
      core_running: true,
      can_start: true,
      blocked: false,
      active_config: '/etc/clashnivo/config/work.yaml'
    })
    render(StatusPage)

    expect(screen.getByText('Selected source')).toBeInTheDocument()
    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getAllByText('Running').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Managed')).toBeInTheDocument()
  })
})
