import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { ServiceStatusResult, UciPackage } from '$lib/api/luci'
import type { ClashConfig, ClashVersion, ConnectionsResponse } from '$lib/api/clash'
import type { GeoIpResult } from '$lib/api/ip'
import StatusPage from '../pages/StatusPage.svelte'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function makeQueryResult<T>(data: T, isSuccess = true) {
  return { data, isPending: false, isError: false, isSuccess } as unknown
}

function makeEmptyQueryResult() {
  return { data: undefined, isPending: false, isError: false, isSuccess: false } as unknown
}

function makeSuccessQueryResultWithNoData() {
  // isSuccess = true but data has no config_path — simulates fresh install
  return { data: { config: {} }, isPending: false, isError: false, isSuccess: true } as unknown
}

function makeMutationResult(mutateAsync = vi.fn().mockResolvedValue(undefined), extra: Record<string, unknown> = {}) {
  return { isPending: false, isError: false, isSuccess: false, mutateAsync, ...extra } as unknown
}

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('$lib/queries/luci', () => ({
  useServiceStatus: vi.fn(),
  useServiceStart: vi.fn(),
  useServiceStop: vi.fn(),
  useServiceRestart: vi.fn(),
  useUciConfig: vi.fn(),
  useSubscriptionAdd: vi.fn(),
  luciKeys: {
    all: ['luci'],
    uci: (pkg: string) => ['luci', 'uci', pkg]
  }
}))

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/svelte-query')>()
  return { ...actual, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })) }
})

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
  useUciConfig,
  useSubscriptionAdd
} from '$lib/queries/luci'
import { useClashConfig, useClashVersion, useConnections, useExternalIp } from '$lib/queries/clash'

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

const configuredUciData: UciPackage = {
  config: { config_path: '/etc/openclash/config/my-sub.yaml', operation_mode: 'fake-ip' }
}

const emptyUciData: UciPackage = {
  config: {}
}

const defaultClashConfig: ClashConfig = {
  mode: 'rule', port: 7890, 'socks-port': 7891, 'redir-port': 0,
  'tproxy-port': 7895, 'log-level': 'info', ipv6: false,
  'allow-lan': true, 'external-controller': '0.0.0.0:9090'
}

function setupEmptyState(addMutate = vi.fn().mockResolvedValue(undefined), addPending = false) {
  vi.mocked(useServiceStatus).mockReturnValue(
    makeQueryResult({ running: false }) as CreateQueryResult<ServiceStatusResult>
  )
  vi.mocked(useUciConfig).mockReturnValue(
    { data: emptyUciData, isPending: false, isError: false, isSuccess: true } as unknown as CreateQueryResult<UciPackage>
  )
  vi.mocked(useClashConfig).mockReturnValue(
    makeEmptyQueryResult() as CreateQueryResult<ClashConfig>
  )
  vi.mocked(useClashVersion).mockReturnValue(makeEmptyQueryResult() as CreateQueryResult<ClashVersion>)
  vi.mocked(useConnections).mockReturnValue(makeEmptyQueryResult() as CreateQueryResult<ConnectionsResponse>)
  vi.mocked(useExternalIp).mockReturnValue(makeEmptyQueryResult() as CreateQueryResult<GeoIpResult>)
  vi.mocked(useServiceStart).mockReturnValue(makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useServiceStop).mockReturnValue(makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useServiceRestart).mockReturnValue(makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useSubscriptionAdd).mockReturnValue(
    makeMutationResult(addMutate, { isPending: addPending }) as unknown as ReturnType<typeof useSubscriptionAdd>
  )
}

function setupConfiguredState() {
  vi.mocked(useServiceStatus).mockReturnValue(
    makeQueryResult({ running: true, pid: 1234 }) as CreateQueryResult<ServiceStatusResult>
  )
  vi.mocked(useUciConfig).mockReturnValue(
    makeQueryResult(configuredUciData) as CreateQueryResult<UciPackage>
  )
  vi.mocked(useClashConfig).mockReturnValue(
    makeQueryResult(defaultClashConfig) as CreateQueryResult<ClashConfig>
  )
  vi.mocked(useClashVersion).mockReturnValue(
    makeQueryResult({ version: '1.18.3', meta: true }) as CreateQueryResult<ClashVersion>
  )
  vi.mocked(useConnections).mockReturnValue(
    makeQueryResult({ downloadTotal: 0, uploadTotal: 0, connections: [] }) as CreateQueryResult<ConnectionsResponse>
  )
  vi.mocked(useExternalIp).mockReturnValue(
    makeQueryResult({ ip: '1.2.3.4', country: 'Japan', country_code: 'JP' }) as CreateQueryResult<GeoIpResult>
  )
  vi.mocked(useServiceStart).mockReturnValue(makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useServiceStop).mockReturnValue(makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useServiceRestart).mockReturnValue(makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useSubscriptionAdd).mockReturnValue(makeMutationResult() as unknown as ReturnType<typeof useSubscriptionAdd>)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StatusPage — empty state', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows "Add your first subscription" heading when no config exists', () => {
    setupEmptyState()
    render(StatusPage)
    expect(screen.getByText('Add your first subscription')).toBeInTheDocument()
  })

  it('shows a subscription URL input in the empty state', () => {
    setupEmptyState()
    render(StatusPage)
    expect(screen.getByRole('textbox', { name: /subscription url/i })).toBeInTheDocument()
  })

  it('shows a "Get Started" button in the empty state', () => {
    setupEmptyState()
    render(StatusPage)
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
  })

  it('does not show service control buttons (Start/Stop/Restart) in empty state', () => {
    setupEmptyState()
    render(StatusPage)
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Restart' })).not.toBeInTheDocument()
  })

  it('does not show the running/stopped status indicator in empty state', () => {
    setupEmptyState()
    render(StatusPage)
    expect(screen.queryByText('Running')).not.toBeInTheDocument()
    expect(screen.queryByText('Stopped')).not.toBeInTheDocument()
  })
})

describe('StatusPage — empty state form validation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows an error when Get Started is clicked with empty input', async () => {
    setupEmptyState()
    render(StatusPage)

    await fireEvent.click(screen.getByRole('button', { name: /get started/i }))
    await waitFor(() => {
      expect(screen.getByText(/please enter a subscription url/i)).toBeInTheDocument()
    })
  })

  it('shows an error for a non-URL value', async () => {
    setupEmptyState()
    render(StatusPage)

    const input = screen.getByRole('textbox', { name: /subscription url/i }) as HTMLInputElement
    input.value = 'not a url at all'
    await fireEvent.input(input)
    await fireEvent.click(screen.getByRole('button', { name: /get started/i }))

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument()
    })
  })

  it('shows an error for a URL that is not http/https', async () => {
    setupEmptyState()
    render(StatusPage)

    const input = screen.getByRole('textbox', { name: /subscription url/i }) as HTMLInputElement
    input.value = 'ftp://example.com/clash'
    await fireEvent.input(input)
    await fireEvent.click(screen.getByRole('button', { name: /get started/i }))

    await waitFor(() => {
      expect(screen.getByText(/must start with http/i)).toBeInTheDocument()
    })
  })

  it('calls subscriptionAdd mutation with the entered URL on valid submit', async () => {
    const addMutate = vi.fn().mockResolvedValue(undefined)
    setupEmptyState(addMutate)
    render(StatusPage)

    const input = screen.getByRole('textbox', { name: /subscription url/i }) as HTMLInputElement
    input.value = 'https://example.com/clash-sub?token=abc'
    await fireEvent.input(input)
    await fireEvent.click(screen.getByRole('button', { name: /get started/i }))

    await waitFor(() => {
      expect(addMutate).toHaveBeenCalledWith({ url: 'https://example.com/clash-sub?token=abc' })
    })
  })

  it('does not call subscriptionAdd when URL is empty', async () => {
    const addMutate = vi.fn()
    setupEmptyState(addMutate)
    render(StatusPage)

    await fireEvent.click(screen.getByRole('button', { name: /get started/i }))

    expect(addMutate).not.toHaveBeenCalled()
  })
})

describe('StatusPage — empty state loading state', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows "Setting up…" on the button while mutation is pending', () => {
    setupEmptyState(vi.fn(), true)
    render(StatusPage)
    expect(screen.getByRole('button', { name: /setting up/i })).toBeInTheDocument()
  })

  it('disables the URL input while mutation is pending', () => {
    setupEmptyState(vi.fn(), true)
    render(StatusPage)
    expect(screen.getByRole('textbox', { name: /subscription url/i })).toBeDisabled()
  })

  it('disables the Get Started button while mutation is pending', () => {
    setupEmptyState(vi.fn(), true)
    render(StatusPage)
    expect(screen.getByRole('button', { name: /setting up/i })).toBeDisabled()
  })
})

describe('StatusPage — configured state (normal view)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the running/stopped indicator when config exists', () => {
    setupConfiguredState()
    render(StatusPage)
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('does not show the "Add your first subscription" prompt when config exists', () => {
    setupConfiguredState()
    render(StatusPage)
    expect(screen.queryByText('Add your first subscription')).not.toBeInTheDocument()
  })

  it('shows Start/Stop/Restart buttons when config exists', () => {
    setupConfiguredState()
    render(StatusPage)
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restart' })).toBeInTheDocument()
  })

  it('shows the Open Dashboard link when config exists', () => {
    setupConfiguredState()
    render(StatusPage)
    expect(screen.getByRole('link', { name: /open dashboard/i })).toBeInTheDocument()
  })
})
