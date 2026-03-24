import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { CoreSourceProbeResult, CoreVersionResult, InstalledCoreResult, ServiceActionResult, ServiceStatusResult, UpdateStatusResult, UciPackage } from '$lib/api/luci'
import StatusPage from '../pages/StatusPage.svelte'

function makeQueryResult<T>(data: T, isSuccess = true) {
  return { data, isPending: false, isError: false, isSuccess } as unknown
}

function makeMutationResult(mutateAsync = vi.fn().mockResolvedValue(undefined), extra: Record<string, unknown> = {}) {
  return { isPending: false, isError: false, isSuccess: false, mutateAsync, ...extra } as unknown
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
  return { ...actual, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })) }
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

function setupEmptyState(addMutate = vi.fn().mockResolvedValue(undefined), addPending = false) {
  vi.mocked(useServiceStatus).mockReturnValue(
    makeQueryResult({ running: false, state: 'disabled', enabled: false, can_start: true, blocked: false } as ServiceStatusResult) as CreateQueryResult<ServiceStatusResult>
  )
  vi.mocked(useUciConfig).mockReturnValue(
    { data: { config: {} }, isPending: false, isError: false, isSuccess: true } as unknown as CreateQueryResult<UciPackage>
  )
  vi.mocked(useCoreCurrent).mockReturnValue(
    makeQueryResult({ installed: false, version: null, core_type: 'Meta' } as InstalledCoreResult) as CreateQueryResult<InstalledCoreResult>
  )
  vi.mocked(useCoreLatestVersion).mockReturnValue(
    makeQueryResult({ version: '1.19.0', core_type: 'Meta', source_policy: 'auto' } as CoreVersionResult) as CreateQueryResult<CoreVersionResult>
  )
  vi.mocked(useCoreRefreshLatestVersion).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useCoreProbeSources).mockReturnValue(
    makeMutationResult() as CreateMutationResult<CoreSourceProbeResult, unknown, void, unknown>
  )
  vi.mocked(useCoreUpdate).mockReturnValue(
    makeMutationResult() as CreateMutationResult<UpdateStatusResult, unknown, void, unknown>
  )
  vi.mocked(useCoreUpdateStatus).mockReturnValue(
    makeQueryResult({ status: 'idle' } as UpdateStatusResult) as CreateQueryResult<UpdateStatusResult>
  )
  vi.mocked(useSetUciConfigBatch).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useProxyGroups).mockReturnValue(makeQueryResult([]) as never)
  vi.mocked(useRuleProviders).mockReturnValue(makeQueryResult([]) as never)
  vi.mocked(useCustomProxies).mockReturnValue(makeQueryResult([]) as never)
  vi.mocked(useCustomRules).mockReturnValue(makeQueryResult([]) as never)
  vi.mocked(useConfigOverwrite).mockReturnValue(makeQueryResult({ content: '' }) as never)
  vi.mocked(useServiceStart).mockReturnValue(makeMutationResult() as CreateMutationResult<ServiceActionResult, unknown, void, unknown>)
  vi.mocked(useServiceStop).mockReturnValue(makeMutationResult() as CreateMutationResult<ServiceActionResult, unknown, void, unknown>)
  vi.mocked(useServiceRestart).mockReturnValue(makeMutationResult() as CreateMutationResult<ServiceActionResult, unknown, void, unknown>)
  vi.mocked(useServiceCancelJob).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useSubscriptionAdd).mockReturnValue(
    makeMutationResult(addMutate, { isPending: addPending }) as unknown as ReturnType<typeof useSubscriptionAdd>
  )
  vi.mocked(useSubscriptionUpdate).mockReturnValue(makeMutationResult() as never)
}

describe('StatusPage empty state', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the first-source setup flow when no config exists', () => {
    setupEmptyState()
    render(StatusPage)

    expect(screen.getByText('Set up Clash Nivo')).toBeInTheDocument()
    expect(screen.getByText('1. Core')).toBeInTheDocument()
    expect(screen.getByText('2. Source')).toBeInTheDocument()
    expect(screen.getByText('3. Start')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save \+ refresh/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open sources/i })).toHaveAttribute('href', '#/sources')
  })

  it('shows the final start step as disabled until setup is ready', () => {
    setupEmptyState()
    render(StatusPage)

    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Restart' })).not.toBeInTheDocument()
  })

  it('validates empty and invalid subscription URLs', async () => {
    setupEmptyState()
    render(StatusPage)

    await fireEvent.click(screen.getByRole('button', { name: /save \+ refresh/i }))
    await waitFor(() => {
      expect(screen.getByText(/please enter a subscription url/i)).toBeInTheDocument()
    })

    const input = screen.getByRole('textbox', { name: /subscription url/i }) as HTMLInputElement
    input.value = 'not a url'
    await fireEvent.input(input)
    await fireEvent.click(screen.getByRole('button', { name: /save \+ refresh/i }))

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument()
    })
  })

  it('submits a valid source URL', async () => {
    const addMutate = vi.fn().mockResolvedValue(undefined)
    setupEmptyState(addMutate)
    render(StatusPage)

    const input = screen.getByRole('textbox', { name: /subscription url/i }) as HTMLInputElement
    input.value = 'https://example.com/sub?token=abc'
    await fireEvent.input(input)
    await fireEvent.click(screen.getByRole('button', { name: /save \+ refresh/i }))

    await waitFor(() => {
      expect(addMutate).toHaveBeenCalledWith({ url: 'https://example.com/sub?token=abc' })
    })
  })
})
