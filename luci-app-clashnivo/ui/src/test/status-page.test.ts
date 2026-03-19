import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { ServiceStatusResult, UciPackage, FileReadResult } from '$lib/api/luci'
import type { ProxyGroup, RuleProvider, CustomRule, CustomProxy } from '$lib/queries/luci'
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
  useUciConfig: vi.fn(),
  useSubscriptionAdd: vi.fn(),
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
  useUciConfig,
  useSubscriptionAdd,
  useProxyGroups,
  useRuleProviders,
  useCustomProxies,
  useCustomRules,
  useConfigOverwrite
} from '$lib/queries/luci'

function setupMocks({
  serviceStatus = {
    running: true,
    service_running: true,
    core_running: true,
    watchdog_running: true,
    can_start: true,
    blocked: false,
    openclash_installed: false,
    openclash_active: false,
    active_config: '/etc/clashnivo/config/work.yaml',
    run_mode: 'fake-ip',
    proxy_mode: 'rule',
    core_type: 'Meta'
  } as ServiceStatusResult,
  proxyGroups = [{ id: 'g1', name: 'Auto', type: 'select', enabled: true }] as ProxyGroup[],
  ruleProviders = [{ id: 'rp1', name: 'Apple', enabled: true, type: 'http', behavior: 'domain', format: 'yaml', position: '0' }] as RuleProvider[],
  customProxies = [{ id: 'cp1', name: 'HK', enabled: true, proxyType: 'ss', server: 'a', port: '443' }] as CustomProxy[],
  customRules = [{ type: 'DOMAIN-SUFFIX', value: 'example.com', target: 'DIRECT' }] as CustomRule[],
  overwriteContent = '# overwrite'
} = {}) {
  vi.mocked(useServiceStatus).mockReturnValue(
    makeQueryResult(serviceStatus) as CreateQueryResult<ServiceStatusResult>
  )
  vi.mocked(useUciConfig).mockReturnValue(
    makeQueryResult({ config: { config_path: '/etc/clashnivo/config/work.yaml' } }) as CreateQueryResult<UciPackage>
  )
  vi.mocked(useProxyGroups).mockReturnValue(makeQueryResult(proxyGroups) as never)
  vi.mocked(useRuleProviders).mockReturnValue(makeQueryResult(ruleProviders) as never)
  vi.mocked(useCustomProxies).mockReturnValue(makeQueryResult(customProxies) as never)
  vi.mocked(useCustomRules).mockReturnValue(makeQueryResult(customRules) as never)
  vi.mocked(useConfigOverwrite).mockReturnValue(
    makeQueryResult({ content: overwriteContent } satisfies FileReadResult) as never
  )
  vi.mocked(useServiceStart).mockReturnValue(makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useServiceStop).mockReturnValue(makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useServiceRestart).mockReturnValue(makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useSubscriptionAdd).mockReturnValue(makeMutationResult() as never)
}

describe('StatusPage reset', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the operational heading and helper text', () => {
    setupMocks()
    render(StatusPage)

    expect(screen.getByRole('heading', { name: 'Status' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /how this works/i })).not.toBeInTheDocument()
  })

  it('shows the running state, source summary, and runtime chips', () => {
    setupMocks()
    render(StatusPage)

    expect(screen.getAllByText('Running').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Source: work')).toBeInTheDocument()
    expect(screen.getByText('Run mode: Fake-IP')).toBeInTheDocument()
    expect(screen.getByText('Proxy mode: Rule')).toBeInTheDocument()
    expect(screen.getByText('Core: Meta')).toBeInTheDocument()
  })

  it('shows compact custom layer counts', () => {
    setupMocks()
    render(StatusPage)

    expect(screen.getByText('Custom proxies')).toBeInTheDocument()
    expect(screen.getByText('Rule providers')).toBeInTheDocument()
    expect(screen.getByText('Proxy groups')).toBeInTheDocument()
    expect(screen.getByText('Custom rules')).toBeInTheDocument()
    expect(screen.getByText('Overwrite')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('shows quick links for compose, logs, and dashboard', () => {
    setupMocks()
    render(StatusPage)

    expect(screen.getByRole('link', { name: /open compose/i })).toHaveAttribute('href', '#/compose')
    expect(screen.getByRole('link', { name: /view logs and diagnostics/i })).toHaveAttribute('href', '#/system')
    expect(screen.getByRole('link', { name: /open dashboard/i })).toHaveAttribute('target', '_blank')
  })

  it('uses clearer service control enablement', () => {
    setupMocks({ serviceStatus: { running: false, can_start: true, blocked: false } })
    render(StatusPage)

    expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled()
  })

  it('shows blocked state and disables start when OpenClash is active', () => {
    setupMocks({
      serviceStatus: {
        running: false,
        can_start: false,
        blocked: true,
        blocked_reason: 'openclash_active',
        openclash_installed: true,
        openclash_active: true,
        active_config: '/etc/clashnivo/config/work.yaml'
      }
    })
    render(StatusPage)

    expect(screen.getAllByText('Blocked').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/openclash is active\. clash nivo cannot take runtime ownership/i)).toBeInTheDocument()
    expect(screen.getByText(/openclash is active and currently blocks clash nivo startup/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
  })

  it('wires service buttons to the corresponding mutations', async () => {
    const startMutate = vi.fn().mockResolvedValue(undefined)
    const stopMutate = vi.fn().mockResolvedValue(undefined)
    const restartMutate = vi.fn().mockResolvedValue(undefined)

    setupMocks({ serviceStatus: { running: true, can_start: true, blocked: false } })
    vi.mocked(useServiceStart).mockReturnValue(makeMutationResult(startMutate) as never)
    vi.mocked(useServiceStop).mockReturnValue(makeMutationResult(stopMutate) as never)
    vi.mocked(useServiceRestart).mockReturnValue(makeMutationResult(restartMutate) as never)

    render(StatusPage)

    await fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Restart' }))

    expect(stopMutate).toHaveBeenCalledOnce()
    expect(restartMutate).toHaveBeenCalledOnce()
  })
})
