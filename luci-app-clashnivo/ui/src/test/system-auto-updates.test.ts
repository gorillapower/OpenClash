import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { UciPackage } from '$lib/api/luci'
import AutoUpdatesCard from '../lib/components/AutoUpdatesCard.svelte'

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
  useSetUciConfigBatch: vi.fn()
}))

import { useUciConfig, useSetUciConfig, useSetUciConfigBatch } from '$lib/queries/luci'

// ---------------------------------------------------------------------------
// UCI test data helpers
// ---------------------------------------------------------------------------

function makeUciPackage(overrides: Record<string, string | string[]> = {}): UciPackage {
  return {
    config: {
      auto_update: '0',
      auto_update_time: '3',
      config_update_week_time: '0',
      config_auto_update_mode: '0',
      geo_auto_update: '0',
      geoip_auto_update: '0',
      geosite_auto_update: '0',
      geoasn_auto_update: '0',
      geo_update_day_time: '4',
      geo_update_week_time: '0',
      chnr_auto_update: '0',
      chnr_update_day_time: '5',
      chnr_update_week_time: '0',
      ...overrides
    }
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function setupMocks({
  uciData = makeUciPackage(),
  setMutateAsync = vi.fn().mockResolvedValue(undefined),
  batchMutateAsync = vi.fn().mockResolvedValue(undefined)
}: {
  uciData?: UciPackage
  setMutateAsync?: ReturnType<typeof vi.fn>
  batchMutateAsync?: ReturnType<typeof vi.fn>
} = {}) {
  vi.mocked(useUciConfig).mockReturnValue(makeQuery(uciData) as never)
  vi.mocked(useSetUciConfig).mockReturnValue(makeMutation(setMutateAsync) as never)
  vi.mocked(useSetUciConfigBatch).mockReturnValue(makeMutation(batchMutateAsync) as never)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AutoUpdatesCard — rendering', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders all 3 update type sections', () => {
    setupMocks()
    render(AutoUpdatesCard)

    expect(screen.getByText('Subscription')).toBeInTheDocument()
    expect(screen.getByText('GEO Databases')).toBeInTheDocument()
    expect(screen.getByText('Chnroute List')).toBeInTheDocument()
  })

  it('renders Auto Updates card heading', () => {
    setupMocks()
    render(AutoUpdatesCard)

    expect(screen.getByText('Auto Updates')).toBeInTheDocument()
  })

  it('renders enable toggle for each update type', () => {
    setupMocks()
    render(AutoUpdatesCard)

    expect(screen.getByRole('switch', { name: /subscription auto-update/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /geo databases auto-update/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /chnroute auto-update/i })).toBeInTheDocument()
  })

  it('shows all toggles as off when all disabled in UCI data', () => {
    setupMocks()
    render(AutoUpdatesCard)

    const switches = screen.getAllByRole('switch')
    for (const sw of switches) {
      expect(sw).toHaveAttribute('aria-checked', 'false')
    }
  })

  it('shows subscription toggle as on when auto_update is 1', () => {
    setupMocks({ uciData: makeUciPackage({ auto_update: '1' }) })
    render(AutoUpdatesCard)

    expect(screen.getByRole('switch', { name: /subscription auto-update/i })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('shows GEO toggle as on when geo_auto_update is 1', () => {
    setupMocks({ uciData: makeUciPackage({ geo_auto_update: '1' }) })
    render(AutoUpdatesCard)

    expect(screen.getByRole('switch', { name: /geo databases auto-update/i })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('shows Chnroute toggle as on when chnr_auto_update is 1', () => {
    setupMocks({ uciData: makeUciPackage({ chnr_auto_update: '1' }) })
    render(AutoUpdatesCard)

    expect(screen.getByRole('switch', { name: /chnroute auto-update/i })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('hides schedule selectors when subscription is disabled', () => {
    setupMocks({ uciData: makeUciPackage({ auto_update: '0' }) })
    render(AutoUpdatesCard)

    expect(screen.queryByRole('combobox', { name: /subscription update day/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /subscription update time/i })).not.toBeInTheDocument()
  })

  it('shows schedule selectors when subscription is enabled', () => {
    setupMocks({ uciData: makeUciPackage({ auto_update: '1' }) })
    render(AutoUpdatesCard)

    expect(screen.getByRole('combobox', { name: /subscription update day/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /subscription update time/i })).toBeInTheDocument()
  })

  it('shows schedule selectors when GEO is enabled', () => {
    setupMocks({ uciData: makeUciPackage({ geo_auto_update: '1' }) })
    render(AutoUpdatesCard)

    expect(screen.getByRole('combobox', { name: /geo update day/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /geo update time/i })).toBeInTheDocument()
  })

  it('shows schedule selectors when Chnroute is enabled', () => {
    setupMocks({ uciData: makeUciPackage({ chnr_auto_update: '1' }) })
    render(AutoUpdatesCard)

    expect(screen.getByRole('combobox', { name: /chnroute update day/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /chnroute update time/i })).toBeInTheDocument()
  })

  it('day selector shows 8 options (every day + Mon-Sun)', () => {
    setupMocks({ uciData: makeUciPackage({ auto_update: '1' }) })
    render(AutoUpdatesCard)

    const select = screen.getByRole('combobox', { name: /subscription update day/i })
    expect(select.querySelectorAll('option')).toHaveLength(8)
  })

  it('time selector shows 24 options (0-23)', () => {
    setupMocks({ uciData: makeUciPackage({ auto_update: '1' }) })
    render(AutoUpdatesCard)

    const select = screen.getByRole('combobox', { name: /subscription update time/i })
    expect(select.querySelectorAll('option')).toHaveLength(24)
  })

  it('subscription time selector reflects UCI value', () => {
    setupMocks({ uciData: makeUciPackage({ auto_update: '1', auto_update_time: '3' }) })
    render(AutoUpdatesCard)

    const select = screen.getByRole('combobox', {
      name: /subscription update time/i
    }) as HTMLSelectElement
    expect(select.value).toBe('3')
  })

  it('shows restart notice text', () => {
    setupMocks()
    render(AutoUpdatesCard)

    expect(screen.getByText(/changes take effect after clash nivo restarts/i)).toBeInTheDocument()
  })
})

describe('AutoUpdatesCard — interactions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('toggling subscription enable calls useSetUciConfigBatch with auto_update key', async () => {
    const batchMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ batchMutateAsync })
    render(AutoUpdatesCard)

    await fireEvent.click(screen.getByRole('switch', { name: /subscription auto-update/i }))

    expect(batchMutateAsync).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ option: 'auto_update' })])
    )
  })

  it('toggling GEO enable calls useSetUciConfigBatch with all 4 geo keys', async () => {
    const batchMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ batchMutateAsync })
    render(AutoUpdatesCard)

    await fireEvent.click(screen.getByRole('switch', { name: /geo databases auto-update/i }))

    expect(batchMutateAsync).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ option: 'geo_auto_update' }),
        expect.objectContaining({ option: 'geoip_auto_update' }),
        expect.objectContaining({ option: 'geosite_auto_update' }),
        expect.objectContaining({ option: 'geoasn_auto_update' })
      ])
    )
  })

  it('toggling Chnroute enable calls useSetUciConfig', async () => {
    const setMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ setMutateAsync })
    render(AutoUpdatesCard)

    await fireEvent.click(screen.getByRole('switch', { name: /chnroute auto-update/i }))

    expect(setMutateAsync).toHaveBeenCalledWith('1')
  })

  it('changing subscription day calls useSetUciConfig mutation', async () => {
    const setMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ uciData: makeUciPackage({ auto_update: '1' }), setMutateAsync })
    render(AutoUpdatesCard)

    const daySelect = screen.getByRole('combobox', { name: /subscription update day/i })
    await fireEvent.change(daySelect, { target: { value: '1' } })

    expect(setMutateAsync).toHaveBeenCalledWith('1')
  })

  it('changing subscription time calls useSetUciConfig mutation', async () => {
    const setMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ uciData: makeUciPackage({ auto_update: '1' }), setMutateAsync })
    render(AutoUpdatesCard)

    const timeSelect = screen.getByRole('combobox', { name: /subscription update time/i })
    await fireEvent.change(timeSelect, { target: { value: '6' } })

    expect(setMutateAsync).toHaveBeenCalledWith('6')
  })

  it('changing GEO day calls useSetUciConfigBatch with all 4 geo week_time keys', async () => {
    const batchMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ uciData: makeUciPackage({ geo_auto_update: '1' }), batchMutateAsync })
    render(AutoUpdatesCard)

    const daySelect = screen.getByRole('combobox', { name: /geo update day/i })
    await fireEvent.change(daySelect, { target: { value: '2' } })

    expect(batchMutateAsync).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ option: 'geo_update_week_time', value: '2' }),
        expect.objectContaining({ option: 'geoip_update_week_time', value: '2' }),
        expect.objectContaining({ option: 'geosite_update_week_time', value: '2' }),
        expect.objectContaining({ option: 'geoasn_update_week_time', value: '2' })
      ])
    )
  })

  it('changing GEO time calls useSetUciConfigBatch with all 4 geo day_time keys', async () => {
    const batchMutateAsync = vi.fn().mockResolvedValue(undefined)
    setupMocks({ uciData: makeUciPackage({ geo_auto_update: '1' }), batchMutateAsync })
    render(AutoUpdatesCard)

    const timeSelect = screen.getByRole('combobox', { name: /geo update time/i })
    await fireEvent.change(timeSelect, { target: { value: '7' } })

    expect(batchMutateAsync).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ option: 'geo_update_day_time', value: '7' }),
        expect.objectContaining({ option: 'geoip_update_day_time', value: '7' }),
        expect.objectContaining({ option: 'geosite_update_day_time', value: '7' }),
        expect.objectContaining({ option: 'geoasn_update_day_time', value: '7' })
      ])
    )
  })
})
