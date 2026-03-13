import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { UciPackage } from '$lib/api/luci'
import NetworkTab from '../pages/settings/NetworkTab.svelte'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('$lib/queries/luci', () => ({
  useUciConfig: vi.fn(),
  useSetUciConfig: vi.fn(),
  useFlushDnsCache: vi.fn()
}))

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/svelte-query')>()
  return { ...actual, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })) }
})

import { useUciConfig, useSetUciConfig, useFlushDnsCache } from '$lib/queries/luci'

// ---------------------------------------------------------------------------
// Mock UCI data
// ---------------------------------------------------------------------------

function makeUciPackage(overrides: Record<string, string | string[]> = {}): UciPackage {
  return {
    config: {
      en_mode: 'fake-ip',
      enable_udp_proxy: '1',
      stack_type: 'gvisor',
      enable_redirect_dns: '1',
      lan_ac_mode: '0',
      lan_ac_black_ips: [],
      lan_ac_black_macs: [],
      lan_ac_white_ips: [],
      lan_ac_white_macs: [],
      ...overrides
    }
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function setupMocks({
  uciData = makeUciPackage(),
  isPending = false,
  setMutateAsync = vi.fn().mockResolvedValue(undefined),
  flushMutateAsync = vi.fn().mockResolvedValue(undefined),
  flushIsPending = false
}: {
  uciData?: UciPackage
  isPending?: boolean
  setMutateAsync?: ReturnType<typeof vi.fn>
  flushMutateAsync?: ReturnType<typeof vi.fn>
  flushIsPending?: boolean
} = {}) {
  vi.mocked(useUciConfig).mockReturnValue(makeQuery(uciData, isPending) as never)
  vi.mocked(useSetUciConfig).mockReturnValue(makeMutation(setMutateAsync) as never)
  vi.mocked(useFlushDnsCache).mockReturnValue(makeMutation(flushMutateAsync, flushIsPending) as never)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NetworkTab', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('initial render', () => {
    it('renders all form controls with correct initial values from mocked UCI data', () => {
      setupMocks()
      render(NetworkTab)

      expect(screen.getByRole('combobox', { name: /operation mode/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /udp proxy/i })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /dns redirect method/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /flush/i })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /device control mode/i })).toBeInTheDocument()
    })

    it('renders operation mode select with fake-ip selected by default', () => {
      setupMocks()
      render(NetworkTab)

      const select = screen.getByRole('combobox', { name: /operation mode/i }) as HTMLSelectElement
      expect(select.value).toBe('fake-ip')
    })

    it('renders UDP proxy toggle as checked when enable_udp_proxy is 1', () => {
      setupMocks({ uciData: makeUciPackage({ enable_udp_proxy: '1' }) })
      render(NetworkTab)

      const toggle = screen.getByRole('switch', { name: /udp proxy/i })
      expect(toggle).toHaveAttribute('aria-checked', 'true')
    })

    it('renders UDP proxy toggle as unchecked when enable_udp_proxy is 0', () => {
      setupMocks({ uciData: makeUciPackage({ enable_udp_proxy: '0' }) })
      render(NetworkTab)

      const toggle = screen.getByRole('switch', { name: /udp proxy/i })
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    it('renders DNS redirect method select with dnsmasq selected', () => {
      setupMocks({ uciData: makeUciPackage({ enable_redirect_dns: '1' }) })
      render(NetworkTab)

      const select = screen.getByRole('combobox', { name: /dns redirect method/i }) as HTMLSelectElement
      expect(select.value).toBe('1')
    })

    it('renders DNS redirect method select with 3 options', () => {
      setupMocks()
      render(NetworkTab)

      const select = screen.getByRole('combobox', { name: /dns redirect method/i })
      const options = select.querySelectorAll('option')
      expect(options).toHaveLength(3)
    })

    it('renders device control mode select with 3 options', () => {
      setupMocks()
      render(NetworkTab)

      const select = screen.getByRole('combobox', { name: /device control mode/i })
      const options = select.querySelectorAll('option')
      expect(options).toHaveLength(3)
    })

    it('renders device control mode as "all" when blacklist is empty', () => {
      setupMocks({ uciData: makeUciPackage({ lan_ac_mode: '0' }) })
      render(NetworkTab)

      const select = screen.getByRole('combobox', { name: /device control mode/i }) as HTMLSelectElement
      expect(select.value).toBe('all')
    })

    it('renders device control mode as "whitelist" when lan_ac_mode is 1', () => {
      setupMocks({ uciData: makeUciPackage({ lan_ac_mode: '1' }) })
      render(NetworkTab)

      const select = screen.getByRole('combobox', { name: /device control mode/i }) as HTMLSelectElement
      expect(select.value).toBe('whitelist')
    })

    it('renders device control mode as "blacklist" when blacklist has entries', () => {
      setupMocks({
        uciData: makeUciPackage({ lan_ac_mode: '0', lan_ac_black_ips: ['192.168.1.100'] })
      })
      render(NetworkTab)

      const select = screen.getByRole('combobox', { name: /device control mode/i }) as HTMLSelectElement
      expect(select.value).toBe('blacklist')
    })
  })

  describe('conditional rendering', () => {
    it('does NOT render TUN stack type when operation mode is fake-ip', () => {
      setupMocks({ uciData: makeUciPackage({ en_mode: 'fake-ip' }) })
      render(NetworkTab)

      expect(screen.queryByRole('combobox', { name: /tun stack type/i })).not.toBeInTheDocument()
    })

    it('does NOT render TUN stack type when operation mode is redir-host', () => {
      setupMocks({ uciData: makeUciPackage({ en_mode: 'redir-host' }) })
      render(NetworkTab)

      expect(screen.queryByRole('combobox', { name: /tun stack type/i })).not.toBeInTheDocument()
    })

    it('renders TUN stack type select when en_mode contains tun', () => {
      setupMocks({ uciData: makeUciPackage({ en_mode: 'fake-ip-tun' }) })
      render(NetworkTab)

      expect(screen.getByRole('combobox', { name: /tun stack type/i })).toBeInTheDocument()
    })

    it('does not show Manage button when device mode is all', () => {
      setupMocks({ uciData: makeUciPackage({ lan_ac_mode: '0' }) })
      render(NetworkTab)

      expect(screen.queryByRole('button', { name: /manage/i })).not.toBeInTheDocument()
    })

    it('shows Manage button when device mode is whitelist', () => {
      setupMocks({ uciData: makeUciPackage({ lan_ac_mode: '1' }) })
      render(NetworkTab)

      expect(screen.getByRole('button', { name: /manage/i })).toBeInTheDocument()
    })

    it('shows Manage button when device mode is blacklist', () => {
      setupMocks({
        uciData: makeUciPackage({ lan_ac_mode: '0', lan_ac_black_ips: ['192.168.1.50'] })
      })
      render(NetworkTab)

      expect(screen.getByRole('button', { name: /manage/i })).toBeInTheDocument()
    })
  })

  describe('interactions — mutations', () => {
    it('calls uci.set when operation mode select changes', async () => {
      const setMutateAsync = vi.fn().mockResolvedValue(undefined)
      setupMocks({ setMutateAsync })
      render(NetworkTab)

      const select = screen.getByRole('combobox', { name: /operation mode/i })
      await fireEvent.change(select, { target: { value: 'redir-host' } })

      await waitFor(() => expect(setMutateAsync).toHaveBeenCalledWith('redir-host'))
    })

    it('maps TUN selection to fake-ip-tun UCI value', async () => {
      const setMutateAsync = vi.fn().mockResolvedValue(undefined)
      setupMocks({ setMutateAsync })
      render(NetworkTab)

      const select = screen.getByRole('combobox', { name: /operation mode/i })
      await fireEvent.change(select, { target: { value: 'tun' } })

      await waitFor(() => expect(setMutateAsync).toHaveBeenCalledWith('fake-ip-tun'))
    })

    it('calls uci.set when UDP proxy toggle is clicked', async () => {
      const setMutateAsync = vi.fn().mockResolvedValue(undefined)
      setupMocks({ setMutateAsync, uciData: makeUciPackage({ enable_udp_proxy: '1' }) })
      render(NetworkTab)

      const toggle = screen.getByRole('switch', { name: /udp proxy/i })
      await fireEvent.click(toggle)

      await waitFor(() => expect(setMutateAsync).toHaveBeenCalledWith('0'))
    })

    it('calls uci.set when UDP proxy toggle is clicked (enabling)', async () => {
      const setMutateAsync = vi.fn().mockResolvedValue(undefined)
      setupMocks({ setMutateAsync, uciData: makeUciPackage({ enable_udp_proxy: '0' }) })
      render(NetworkTab)

      const toggle = screen.getByRole('switch', { name: /udp proxy/i })
      await fireEvent.click(toggle)

      await waitFor(() => expect(setMutateAsync).toHaveBeenCalledWith('1'))
    })

    it('calls uci.set when DNS redirect method changes', async () => {
      const setMutateAsync = vi.fn().mockResolvedValue(undefined)
      setupMocks({ setMutateAsync })
      render(NetworkTab)

      const select = screen.getByRole('combobox', { name: /dns redirect method/i })
      await fireEvent.change(select, { target: { value: '2' } })

      await waitFor(() => expect(setMutateAsync).toHaveBeenCalledWith('2'))
    })

    it('calls flush DNS method when Flush button is clicked', async () => {
      const flushMutateAsync = vi.fn().mockResolvedValue(undefined)
      setupMocks({ flushMutateAsync })
      render(NetworkTab)

      const btn = screen.getByRole('button', { name: /flush/i })
      await fireEvent.click(btn)

      await waitFor(() => expect(flushMutateAsync).toHaveBeenCalled())
    })

    it('shows Flushing… text on the flush button while pending', () => {
      setupMocks({ flushIsPending: true })
      render(NetworkTab)

      expect(screen.getByRole('button', { name: /flushing/i })).toBeInTheDocument()
    })

    it('calls uci.set when device mode select changes', async () => {
      const setMutateAsync = vi.fn().mockResolvedValue(undefined)
      setupMocks({ setMutateAsync })
      render(NetworkTab)

      const select = screen.getByRole('combobox', { name: /device control mode/i })
      await fireEvent.change(select, { target: { value: 'whitelist' } })

      await waitFor(() => expect(setMutateAsync).toHaveBeenCalledWith('1'))
    })
  })

  describe('tooltips', () => {
    it('renders an info tooltip for Operation mode', () => {
      setupMocks()
      render(NetworkTab)

      const tooltips = screen.getAllByRole('button', { name: /more information/i })
      expect(tooltips.length).toBeGreaterThanOrEqual(1)
    })

    it('every setting has an info tooltip icon', () => {
      setupMocks()
      render(NetworkTab)

      // 5 settings visible by default: operation mode, udp proxy, redirect method,
      // flush dns cache, device control mode
      const tooltips = screen.getAllByRole('button', { name: /more information/i })
      expect(tooltips.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('loading state', () => {
    it('shows skeleton loaders while config is pending', () => {
      setupMocks({ isPending: true })
      const { container } = render(NetworkTab)

      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('does not render settings sections while config is pending', () => {
      setupMocks({ isPending: true })
      render(NetworkTab)

      expect(screen.queryByRole('combobox', { name: /operation mode/i })).not.toBeInTheDocument()
    })
  })
})
