import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { ServiceStatusResult, UciPackage } from '$lib/api/luci'
import type { ClashConfig } from '$lib/api/clash'
import StatusPage from '../pages/StatusPage.svelte'

// ---------------------------------------------------------------------------
// Mock helpers
// TanStack Query v6 returns a reactive Proxy with many fields. In tests we only
// need the subset the component reads, so we cast via `unknown` to avoid
// having to satisfy the full structural type.
// ---------------------------------------------------------------------------

function makeQueryResult<T>(data: T) {
  return { data, isPending: false, isError: false, isSuccess: true } as unknown
}

function makeMutationResult(mutateAsync: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(undefined)) {
  return { isPending: false, isError: false, isSuccess: false, mutateAsync } as unknown
}

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('$lib/queries/luci', () => ({
  useServiceStatus: vi.fn(),
  useServiceStart: vi.fn(),
  useServiceStop: vi.fn(),
  useServiceRestart: vi.fn(),
  useUciConfig: vi.fn()
}))

vi.mock('$lib/queries/clash', () => ({
  useClashConfig: vi.fn(),
  useClashVersion: vi.fn(),
  useConnections: vi.fn(),
  useExternalIp: vi.fn()
}))

import {
  useServiceStatus,
  useServiceStart,
  useServiceStop,
  useServiceRestart,
  useUciConfig
} from '$lib/queries/luci'
import { useClashConfig, useClashVersion, useConnections, useExternalIp } from '$lib/queries/clash'

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------

function setupMocks({
  running = true,
  configPath = '/etc/openclash/config/my-subscription.yaml',
  operationMode = 'fake-ip',
  proxyMode = 'rule' as 'rule' | 'global' | 'direct',
  startMutate = vi.fn().mockResolvedValue(undefined),
  stopMutate = vi.fn().mockResolvedValue(undefined),
  restartMutate = vi.fn().mockResolvedValue(undefined)
} = {}) {
  vi.mocked(useServiceStatus).mockReturnValue(
    makeQueryResult({ running, pid: running ? 1234 : undefined }) as CreateQueryResult<ServiceStatusResult>
  )
  vi.mocked(useUciConfig).mockReturnValue(
    makeQueryResult({ config: { config_path: configPath, operation_mode: operationMode } }) as CreateQueryResult<UciPackage>
  )
  vi.mocked(useClashConfig).mockReturnValue(
    makeQueryResult({ mode: proxyMode, port: 7890, 'socks-port': 7891, 'redir-port': 0, 'tproxy-port': 7895, 'log-level': 'info', ipv6: false, 'allow-lan': true, 'external-controller': '0.0.0.0:9090' }) as CreateQueryResult<ClashConfig>
  )
  vi.mocked(useClashVersion).mockReturnValue(
    makeQueryResult({ version: '1.18.0', meta: true }) as unknown as ReturnType<typeof useClashVersion>
  )
  vi.mocked(useConnections).mockReturnValue(
    makeQueryResult({ downloadTotal: 0, uploadTotal: 0, connections: [] }) as unknown as ReturnType<typeof useConnections>
  )
  vi.mocked(useExternalIp).mockReturnValue(
    makeQueryResult({ ip: '1.2.3.4', country: 'Japan' }) as unknown as ReturnType<typeof useExternalIp>
  )
  vi.mocked(useServiceStart).mockReturnValue(makeMutationResult(startMutate) as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useServiceStop).mockReturnValue(makeMutationResult(stopMutate) as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useServiceRestart).mockReturnValue(makeMutationResult(restartMutate) as CreateMutationResult<void, unknown, void, unknown>)
}

function renderPage() {
  return render(StatusPage)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StatusPage — running state indicator', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a green indicator and "Running" when Clash is running', () => {
    setupMocks({ running: true })
    renderPage()

    expect(screen.getByText('Running')).toBeInTheDocument()
    const indicator = document.querySelector('.bg-green-500')
    expect(indicator).toBeInTheDocument()
  })

  it('shows a red indicator and "Stopped" when Clash is stopped', () => {
    setupMocks({ running: false })
    renderPage()

    expect(screen.getByText('Stopped')).toBeInTheDocument()
    const indicator = document.querySelector('.bg-red-500')
    expect(indicator).toBeInTheDocument()
  })

  it('renders the page heading "Status"', () => {
    setupMocks()
    renderPage()
    expect(screen.getByRole('heading', { name: 'Status' })).toBeInTheDocument()
  })
})

describe('StatusPage — info row', () => {
  beforeEach(() => vi.clearAllMocks())

  it('displays the config name without path or extension', () => {
    setupMocks({ configPath: '/etc/openclash/config/my-subscription.yaml' })
    renderPage()
    expect(screen.getByText('my-subscription')).toBeInTheDocument()
  })

  it('displays the formatted operation mode', () => {
    setupMocks({ operationMode: 'fake-ip' })
    renderPage()
    expect(screen.getByText('Fake-IP')).toBeInTheDocument()
  })

  it('formats redir-host correctly', () => {
    setupMocks({ operationMode: 'redir-host' })
    renderPage()
    expect(screen.getByText('Redir-Host')).toBeInTheDocument()
  })

  it('formats tun correctly', () => {
    setupMocks({ operationMode: 'tun' })
    renderPage()
    expect(screen.getByText('TUN')).toBeInTheDocument()
  })

  it('displays the proxy mode from Clash config', () => {
    setupMocks({ proxyMode: 'rule' })
    renderPage()
    expect(screen.getByText('Rule')).toBeInTheDocument()
  })

  it('displays global proxy mode', () => {
    setupMocks({ proxyMode: 'global' })
    renderPage()
    expect(screen.getByText('Global')).toBeInTheDocument()
  })
})

describe('StatusPage — service control buttons', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Start button calls useServiceStart mutateAsync', async () => {
    const startMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks({ running: false, startMutate })
    renderPage()

    await fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(startMutate).toHaveBeenCalledOnce()
  })

  it('Stop button calls useServiceStop mutateAsync', async () => {
    const stopMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks({ running: true, stopMutate })
    renderPage()

    await fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(stopMutate).toHaveBeenCalledOnce()
  })

  it('Restart button calls useServiceRestart mutateAsync', async () => {
    const restartMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks({ running: true, restartMutate })
    renderPage()

    await fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(restartMutate).toHaveBeenCalledOnce()
  })

  it('Start button is disabled when service is running', () => {
    setupMocks({ running: true })
    renderPage()
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
  })

  it('Stop button is disabled when service is stopped', () => {
    setupMocks({ running: false })
    renderPage()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
  })

  it('Restart button is always enabled when not busy', () => {
    setupMocks({ running: true })
    renderPage()
    expect(screen.getByRole('button', { name: 'Restart' })).not.toBeDisabled()
  })
})

describe('StatusPage — optimistic UI', () => {
  beforeEach(() => vi.clearAllMocks())

  it('immediately shows Running after clicking Start before API confirms', async () => {
    // Start mutation is slow — never resolves during this test
    const startMutate = vi.fn().mockReturnValue(new Promise(() => {}))
    setupMocks({ running: false, startMutate })
    renderPage()

    expect(screen.getByText('Stopped')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    await waitFor(() => expect(screen.getByText('Running')).toBeInTheDocument())
  })

  it('immediately shows Stopped after clicking Stop before API confirms', async () => {
    const stopMutate = vi.fn().mockReturnValue(new Promise(() => {}))
    setupMocks({ running: true, stopMutate })
    renderPage()

    expect(screen.getByText('Running')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    await waitFor(() => expect(screen.getByText('Stopped')).toBeInTheDocument())
  })
})

describe('StatusPage — dashboard button', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the Open Dashboard link', () => {
    setupMocks()
    renderPage()
    const link = screen.getByRole('link', { name: /open dashboard/i })
    expect(link).toBeInTheDocument()
  })

  it('Open Dashboard link points to the Clash UI', () => {
    setupMocks()
    renderPage()
    const link = screen.getByRole('link', { name: /open dashboard/i })
    expect(link).toHaveAttribute('href', expect.stringContaining(':9090/ui'))
  })

  it('Open Dashboard link opens in a new tab', () => {
    setupMocks()
    renderPage()
    const link = screen.getByRole('link', { name: /open dashboard/i })
    expect(link).toHaveAttribute('target', '_blank')
  })
})
