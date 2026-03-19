import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { ServiceStatusResult, UciPackage } from '$lib/api/luci'
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

function setupEmptyState(addMutate = vi.fn().mockResolvedValue(undefined), addPending = false) {
  vi.mocked(useServiceStatus).mockReturnValue(
    makeQueryResult({ running: false, can_start: true, blocked: false } as ServiceStatusResult) as CreateQueryResult<ServiceStatusResult>
  )
  vi.mocked(useUciConfig).mockReturnValue(
    { data: { config: {} }, isPending: false, isError: false, isSuccess: true } as unknown as CreateQueryResult<UciPackage>
  )
  vi.mocked(useProxyGroups).mockReturnValue(makeQueryResult([]) as never)
  vi.mocked(useRuleProviders).mockReturnValue(makeQueryResult([]) as never)
  vi.mocked(useCustomProxies).mockReturnValue(makeQueryResult([]) as never)
  vi.mocked(useCustomRules).mockReturnValue(makeQueryResult([]) as never)
  vi.mocked(useConfigOverwrite).mockReturnValue(makeQueryResult({ content: '' }) as never)
  vi.mocked(useServiceStart).mockReturnValue(makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useServiceStop).mockReturnValue(makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useServiceRestart).mockReturnValue(makeMutationResult() as CreateMutationResult<void, unknown, void, unknown>)
  vi.mocked(useSubscriptionAdd).mockReturnValue(
    makeMutationResult(addMutate, { isPending: addPending }) as unknown as ReturnType<typeof useSubscriptionAdd>
  )
}

describe('StatusPage empty state', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the first-source setup flow when no config exists', () => {
    setupEmptyState()
    render(StatusPage)

    expect(screen.getByText('Add your first source')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add source/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open sources/i })).toHaveAttribute('href', '#/sources')
  })

  it('does not show service control buttons in empty state', () => {
    setupEmptyState()
    render(StatusPage)

    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Restart' })).not.toBeInTheDocument()
  })

  it('validates empty and invalid subscription URLs', async () => {
    setupEmptyState()
    render(StatusPage)

    await fireEvent.click(screen.getByRole('button', { name: /add source/i }))
    await waitFor(() => {
      expect(screen.getByText(/please enter a subscription url/i)).toBeInTheDocument()
    })

    const input = screen.getByRole('textbox', { name: /subscription url/i }) as HTMLInputElement
    input.value = 'not a url'
    await fireEvent.input(input)
    await fireEvent.click(screen.getByRole('button', { name: /add source/i }))

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
    await fireEvent.click(screen.getByRole('button', { name: /add source/i }))

    await waitFor(() => {
      expect(addMutate).toHaveBeenCalledWith({ url: 'https://example.com/sub?token=abc' })
    })
  })
})
