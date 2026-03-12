import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import type { CreateQueryResult } from '@tanstack/svelte-query'
import type { ServiceStatusResult, UciPackage } from '$lib/api/luci'
import type { ClashConfig, ClashVersion, ConnectionsResponse } from '$lib/api/clash'
import type { GeoIpResult } from '$lib/api/ip'
import { formatBytes } from '$lib/utils'
import StatusPage from '../pages/StatusPage.svelte'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function makeQueryResult<T>(data: T) {
  return { data, isPending: false, isError: false, isSuccess: true } as unknown
}

function makeEmptyQueryResult() {
  return { data: undefined, isPending: false, isError: false, isSuccess: false } as unknown
}

function makeMutationResult(mutateAsync = vi.fn().mockResolvedValue(undefined)) {
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

const defaultUciData: UciPackage = {
  config: { config_path: '/etc/openclash/config/my-sub.yaml', operation_mode: 'fake-ip' }
}

const defaultClashConfig: ClashConfig = {
  mode: 'rule', port: 7890, 'socks-port': 7891, 'redir-port': 0,
  'tproxy-port': 7895, 'log-level': 'info', ipv6: false,
  'allow-lan': true, 'external-controller': '0.0.0.0:9090'
}

const defaultVersion: ClashVersion = { version: '1.18.3', meta: true }

const defaultConnections: ConnectionsResponse = {
  downloadTotal: 1073741824,  // 1 GB
  uploadTotal: 524288,         // 512 KB
  connections: []
}

const defaultGeoIp: GeoIpResult = {
  ip: '1.2.3.4',
  city: 'Tokyo',
  country: 'Japan',
  country_code: 'JP'
}

function setupMocks({
  running = true,
  version = defaultVersion as ClashVersion | null,
  connections = defaultConnections as ConnectionsResponse | null,
  geoIp = defaultGeoIp as GeoIpResult | null
} = {}) {
  vi.mocked(useServiceStatus).mockReturnValue(
    makeQueryResult({ running, pid: running ? 1234 : undefined }) as CreateQueryResult<ServiceStatusResult>
  )
  vi.mocked(useUciConfig).mockReturnValue(
    makeQueryResult(defaultUciData) as CreateQueryResult<UciPackage>
  )
  vi.mocked(useClashConfig).mockReturnValue(
    makeQueryResult(defaultClashConfig) as CreateQueryResult<ClashConfig>
  )
  vi.mocked(useClashVersion).mockReturnValue(
    version !== null ? makeQueryResult(version) as CreateQueryResult<ClashVersion>
                     : makeEmptyQueryResult() as CreateQueryResult<ClashVersion>
  )
  vi.mocked(useConnections).mockReturnValue(
    connections !== null ? makeQueryResult(connections) as CreateQueryResult<ConnectionsResponse>
                         : makeEmptyQueryResult() as CreateQueryResult<ConnectionsResponse>
  )
  vi.mocked(useExternalIp).mockReturnValue(
    geoIp !== null ? makeQueryResult(geoIp) as CreateQueryResult<GeoIpResult>
                   : makeEmptyQueryResult() as CreateQueryResult<GeoIpResult>
  )
  vi.mocked(useServiceStart).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useServiceStop).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useServiceRestart).mockReturnValue(makeMutationResult() as never)
  vi.mocked(useSubscriptionAdd).mockReturnValue(makeMutationResult() as never)
}

function renderPage() {
  return render(StatusPage)
}

// ---------------------------------------------------------------------------
// formatBytes unit tests
// ---------------------------------------------------------------------------

describe('formatBytes', () => {
  it('formats bytes under 1 KB', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats KB range', () => {
    expect(formatBytes(524288)).toBe('512.0 KB')
  })

  it('formats MB range', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('formats GB range', () => {
    expect(formatBytes(1073741824)).toBe('1.00 GB')
  })

  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })
})

// ---------------------------------------------------------------------------
// External IP card
// ---------------------------------------------------------------------------

describe('StatusPage — External IP card', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows IP address when data is available', () => {
    setupMocks({ running: true, geoIp: defaultGeoIp })
    renderPage()
    expect(screen.getByText('1.2.3.4')).toBeInTheDocument()
  })

  it('shows city and country when available', () => {
    setupMocks({ running: true, geoIp: defaultGeoIp })
    renderPage()
    expect(screen.getByText('Tokyo, Japan')).toBeInTheDocument()
  })

  it('shows "—" when geo IP data is unavailable', () => {
    setupMocks({ running: false, geoIp: null })
    renderPage()
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it('renders "External IP" card heading', () => {
    setupMocks()
    renderPage()
    expect(screen.getByText('External IP')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Traffic card
// ---------------------------------------------------------------------------

describe('StatusPage — Traffic card', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows formatted upload total', () => {
    setupMocks({ running: true, connections: defaultConnections })
    renderPage()
    expect(screen.getByText('512.0 KB')).toBeInTheDocument()
  })

  it('shows formatted download total', () => {
    setupMocks({ running: true, connections: defaultConnections })
    renderPage()
    expect(screen.getByText('1.00 GB')).toBeInTheDocument()
  })

  it('shows "—" when connections data is unavailable', () => {
    setupMocks({ running: false, connections: null })
    renderPage()
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Traffic" card heading', () => {
    setupMocks()
    renderPage()
    expect(screen.getByText('Traffic')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Core version card
// ---------------------------------------------------------------------------

describe('StatusPage — Core version card', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows version string when data is available', () => {
    setupMocks({ version: defaultVersion })
    renderPage()
    expect(screen.getByText('1.18.3')).toBeInTheDocument()
  })

  it('shows "Mihomo" label when meta is true', () => {
    setupMocks({ version: { version: '1.18.3', meta: true } })
    renderPage()
    expect(screen.getByText('Mihomo')).toBeInTheDocument()
  })

  it('does not show "Mihomo" label when meta is false', () => {
    setupMocks({ version: { version: '1.18.3', meta: false } })
    renderPage()
    expect(screen.queryByText('Mihomo')).not.toBeInTheDocument()
  })

  it('shows "—" when version data is unavailable', () => {
    setupMocks({ version: null })
    renderPage()
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Core Version" card heading', () => {
    setupMocks()
    renderPage()
    expect(screen.getByText('Core Version')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Graceful empty states (Clash stopped)
// ---------------------------------------------------------------------------

describe('StatusPage — graceful empty states when stopped', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows all three "—" placeholders when all card data is absent', () => {
    setupMocks({ running: false, geoIp: null, connections: null, version: null })
    renderPage()
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBe(3)
  })

  it('still renders all three card headings even when stopped', () => {
    setupMocks({ running: false, geoIp: null, connections: null, version: null })
    renderPage()
    expect(screen.getByText('External IP')).toBeInTheDocument()
    expect(screen.getByText('Traffic')).toBeInTheDocument()
    expect(screen.getByText('Core Version')).toBeInTheDocument()
  })
})
