import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { ConfigCompositionResult, FileReadResult } from '$lib/api/luci'
import ComposePage from '../pages/ComposePage.svelte'

function makeQuery<T>(data: T | undefined, isPending = false) {
  return { data, isPending, isError: false, isSuccess: !isPending } as unknown as CreateQueryResult<T>
}

function makeMutation<TData = unknown, TVars = unknown>(
  mutateAsync = vi.fn<(...args: TVars[]) => Promise<TData>>().mockResolvedValue(undefined as Awaited<TData>),
  isPending = false
) {
  return {
    isPending,
    isError: false,
    isSuccess: false,
    mutateAsync,
    mutate: vi.fn()
  } as unknown as CreateMutationResult<TData, unknown, TVars>
}

vi.mock('$lib/queries/luci', () => ({
  useConfigs: vi.fn(),
  useConfigSetActive: vi.fn(),
  useConfigPreview: vi.fn(),
  useConfigValidate: vi.fn(),
  useServiceStatus: vi.fn(),
  useServiceRestart: vi.fn(),
  useProxyGroups: vi.fn(),
  useDeleteProxyGroup: vi.fn(),
  useToggleProxyGroup: vi.fn(),
  useAddProxyGroup: vi.fn(),
  useUpdateProxyGroup: vi.fn(),
  useRuleProviders: vi.fn(),
  useDeleteRuleProvider: vi.fn(),
  useToggleRuleProvider: vi.fn(),
  useAddRuleProvider: vi.fn(),
  useUpdateRuleProvider: vi.fn(),
  useCustomProxies: vi.fn(),
  useDeleteCustomProxy: vi.fn(),
  useToggleCustomProxy: vi.fn(),
  useAddCustomProxy: vi.fn(),
  useUpdateCustomProxy: vi.fn(),
  useCustomRules: vi.fn(),
  useSetCustomRules: vi.fn(),
  useConfigOverwrite: vi.fn(),
  useSetConfigOverwrite: vi.fn(),
  scopeAppliesToCurrentSource: vi.fn((scopeMode: string, scopeTargets: string[], sourceName?: string) =>
    scopeMode === 'all' || (!!sourceName && scopeTargets.includes(sourceName))
  )
}))

import {
  useConfigs,
  useConfigSetActive,
  useConfigPreview,
  useConfigValidate,
  useServiceStatus,
  useServiceRestart,
  useProxyGroups,
  useDeleteProxyGroup,
  useToggleProxyGroup,
  useAddProxyGroup,
  useUpdateProxyGroup,
  useRuleProviders,
  useDeleteRuleProvider,
  useToggleRuleProvider,
  useAddRuleProvider,
  useUpdateRuleProvider,
  useCustomProxies,
  useDeleteCustomProxy,
  useToggleCustomProxy,
  useAddCustomProxy,
  useUpdateCustomProxy,
  useCustomRules,
  useSetCustomRules,
  useConfigOverwrite,
  useSetConfigOverwrite
} from '$lib/queries/luci'

const previewResult: ConfigCompositionResult = {
  valid: true,
  config_name: 'alpha',
  source_path: '/etc/clashnivo/config/alpha.yaml',
  preview_path: '/tmp/clashnivo-preview/alpha.yaml',
  preview_exists: true,
  preview_content: 'proxies:\n  - name: alpha',
  stages: [
    { name: 'source', status: 'ok', message: 'Loaded source config.' },
    { name: 'custom_rules', status: 'ok', message: 'Applied rules.' }
  ]
}

const validateResult: ConfigCompositionResult = {
  valid: true,
  config_name: 'alpha',
  stages: [
    { name: 'source', status: 'ok', message: 'Loaded source config.' },
    { name: 'validation', status: 'ok', message: 'Final config is valid.' }
  ]
}

function setupMocks({
  configs = [{ name: 'alpha', active: true }],
  preview = previewResult,
  validation = validateResult,
  overwrite = { content: '# overwrite' } satisfies FileReadResult
}: {
  configs?: Array<{ name: string; active: boolean }>
  preview?: ConfigCompositionResult
  validation?: ConfigCompositionResult
  overwrite?: FileReadResult
} = {}) {
  vi.mocked(useConfigs).mockReturnValue(makeQuery(configs) as never)
  vi.mocked(useServiceStatus).mockReturnValue(makeQuery({ busy: false, busy_command: null }) as never)
  vi.mocked(useConfigSetActive).mockReturnValue(makeMutation(vi.fn().mockResolvedValue(undefined)) as never)
  vi.mocked(useConfigPreview).mockReturnValue(makeMutation(vi.fn().mockResolvedValue(preview)) as never)
  vi.mocked(useConfigValidate).mockReturnValue(makeMutation(vi.fn().mockResolvedValue(validation)) as never)
  vi.mocked(useServiceRestart).mockReturnValue(makeMutation(vi.fn().mockResolvedValue(undefined)) as never)
  vi.mocked(useProxyGroups).mockReturnValue(makeQuery([{ id: 'g1', name: 'Global', type: 'select', enabled: true, scopeMode: 'all', scopeTargets: [] }]) as never)
  vi.mocked(useDeleteProxyGroup).mockReturnValue(makeMutation() as never)
  vi.mocked(useToggleProxyGroup).mockReturnValue(makeMutation() as never)
  vi.mocked(useAddProxyGroup).mockReturnValue(makeMutation() as never)
  vi.mocked(useUpdateProxyGroup).mockReturnValue(makeMutation() as never)
  vi.mocked(useRuleProviders).mockReturnValue(makeQuery([{ id: 'rp1', name: 'Ads', enabled: true, type: 'http', behavior: 'domain', format: 'yaml', position: '0', scopeMode: 'all', scopeTargets: [] }]) as never)
  vi.mocked(useDeleteRuleProvider).mockReturnValue(makeMutation() as never)
  vi.mocked(useToggleRuleProvider).mockReturnValue(makeMutation() as never)
  vi.mocked(useAddRuleProvider).mockReturnValue(makeMutation() as never)
  vi.mocked(useUpdateRuleProvider).mockReturnValue(makeMutation() as never)
  vi.mocked(useCustomProxies).mockReturnValue(makeQuery([{ id: 'cp1', name: 'My VPS', proxyType: 'ss', server: '1.1.1.1', port: '443', enabled: true, scopeMode: 'all', scopeTargets: [] }]) as never)
  vi.mocked(useDeleteCustomProxy).mockReturnValue(makeMutation() as never)
  vi.mocked(useToggleCustomProxy).mockReturnValue(makeMutation() as never)
  vi.mocked(useAddCustomProxy).mockReturnValue(makeMutation() as never)
  vi.mocked(useUpdateCustomProxy).mockReturnValue(makeMutation() as never)
  vi.mocked(useCustomRules).mockReturnValue(makeQuery([{ type: 'DOMAIN-SUFFIX', value: 'google.com', target: 'DIRECT', scopeMode: 'all', scopeTargets: [] }]) as never)
  vi.mocked(useSetCustomRules).mockReturnValue(makeMutation() as never)
  vi.mocked(useConfigOverwrite).mockReturnValue(makeQuery(overwrite) as never)
  vi.mocked(useSetConfigOverwrite).mockReturnValue(makeMutation() as never)
}

describe('ComposePage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the selected source and custom layer summary', () => {
    setupMocks()
    render(ComposePage)

    expect(screen.getByRole('heading', { name: 'Compose' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /how this works/i })).toBeInTheDocument()
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /selected source/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^switch$/i })).toBeDisabled()
    expect(screen.getAllByText('1. Custom Proxies').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2. Rule Providers').length).toBeGreaterThan(0)
    expect(screen.getAllByText('3. Proxy Groups').length).toBeGreaterThan(0)
    expect(screen.getAllByText('4. Custom Rules').length).toBeGreaterThan(0)
    expect(screen.getAllByText('5. Overwrite').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 of 1').length).toBeGreaterThan(0)
    expect(screen.getByText('Configured')).toBeInTheDocument()
  })

  it('shows the no-source state when nothing is selected', () => {
    setupMocks({ configs: [] })
    render(ComposePage)

    expect(screen.getByText(/no source selected/i)).toBeInTheDocument()
    expect(screen.getByText(/selection required/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to sources/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /preview generated config/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /validate generated config/i })).toBeDisabled()
  })

  it('runs preview and renders preview content', async () => {
    const previewMutate = vi.fn().mockResolvedValue(previewResult)
    setupMocks()
    vi.mocked(useConfigPreview).mockReturnValue(makeMutation(previewMutate) as never)

    render(ComposePage)
    await fireEvent.click(screen.getByRole('button', { name: /preview generated config/i }))

    await waitFor(() => {
      expect(previewMutate).toHaveBeenCalledOnce()
      expect(screen.getByText('Preview')).toBeInTheDocument()
      expect(screen.getByText(/proxies:/i)).toBeInTheDocument()
    })
  })

  it('switches source only after explicit confirmation from the pipeline summary', async () => {
    const setActiveMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks({ configs: [{ name: 'alpha', active: true }, { name: 'beta.yaml', active: false }] })
    vi.mocked(useConfigSetActive).mockReturnValue(makeMutation(setActiveMutate) as never)

    render(ComposePage)

    await fireEvent.change(screen.getByRole('combobox', { name: /selected source/i }), {
      target: { value: 'beta.yaml' }
    })

    expect(setActiveMutate).not.toHaveBeenCalled()
    await fireEvent.click(screen.getByRole('button', { name: /^switch$/i }))
    await waitFor(() => expect(setActiveMutate).toHaveBeenCalledWith('beta.yaml'))
  })

  it('requires successful validation before activation is enabled', async () => {
    const validateMutate = vi.fn().mockResolvedValue(validateResult)
    const restartMutate = vi.fn().mockResolvedValue(undefined)
    setupMocks()
    vi.mocked(useConfigValidate).mockReturnValue(makeMutation(validateMutate) as never)
    vi.mocked(useServiceRestart).mockReturnValue(makeMutation(restartMutate) as never)

    render(ComposePage)

    const activateButton = screen.getByRole('button', { name: /activate generated config/i })
    expect(activateButton).toBeDisabled()

    await fireEvent.click(screen.getByRole('button', { name: /validate generated config/i }))

    await waitFor(() => {
      expect(validateMutate).toHaveBeenCalledOnce()
      expect(activateButton).toBeEnabled()
      expect(screen.getByText(/validation passed/i)).toBeInTheDocument()
    })

    await fireEvent.click(activateButton)

    await waitFor(() => {
      expect(restartMutate).toHaveBeenCalledOnce()
    })
  })

  it('explains activation semantics clearly in the page explainer', async () => {
    setupMocks()
    render(ComposePage)

    await fireEvent.click(screen.getByRole('button', { name: /how this works/i }))

    expect(
      screen.getByText(/activate makes the current validated generated config live by restarting clash nivo with it/i)
    ).toBeInTheDocument()
  })

  it('opens the page explainer with the composition flow', async () => {
    setupMocks()
    render(ComposePage)

    await fireEvent.click(screen.getByRole('button', { name: /how this works/i }))

    const dialog = screen.getByRole('dialog', { name: 'Compose' })
    expect(dialog).toBeInTheDocument()

    const scoped = within(dialog)
    expect(scoped.getAllByText('Selected source').length).toBeGreaterThan(0)
    expect(scoped.getAllByText('Customizations').length).toBeGreaterThan(0)
    expect(scoped.getAllByText('Preview').length).toBeGreaterThan(0)
    expect(scoped.getAllByText('Validate').length).toBeGreaterThan(0)
    expect(scoped.getAllByText('Activate').length).toBeGreaterThan(0)
  })
})
