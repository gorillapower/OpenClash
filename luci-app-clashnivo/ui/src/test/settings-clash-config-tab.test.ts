import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte'
import type { CreateQueryResult, CreateMutationResult } from '@tanstack/svelte-query'
import type { FileReadResult } from '$lib/api/luci'
import ClashConfigTab from '../pages/settings/ClashConfigTab.svelte'

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
  useConfigs: vi.fn(),
  useProxyGroups: vi.fn(),
  useDeleteProxyGroup: vi.fn(),
  useToggleProxyGroup: vi.fn(),
  useAddProxyGroup: vi.fn(),
  useUpdateProxyGroup: vi.fn(),
  useCustomRules: vi.fn(),
  useSetCustomRules: vi.fn(),
  useConfigOverwrite: vi.fn(),
  useSetConfigOverwrite: vi.fn(),
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
  scopeAppliesToCurrentSource: vi.fn((scopeMode: string, scopeTargets: string[], sourceName?: string) =>
    scopeMode === 'all' || (!!sourceName && scopeTargets.includes(sourceName))
  ),
  isNarrowerScope: vi.fn((childMode: string, childTargets: string[], parentMode: string, parentTargets: string[]) => {
    if (childMode === 'all') return parentMode !== 'all'
    if (parentMode === 'all') return false
    return childTargets.some((target) => !parentTargets.includes(target))
  })
}))

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/svelte-query')>()
  return { ...actual, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })) }
})

import type { ProxyGroup, CustomRule, RuleProvider, CustomProxy } from '$lib/queries/luci'
import {
  useConfigs,
  useProxyGroups,
  useDeleteProxyGroup,
  useToggleProxyGroup,
  useAddProxyGroup,
  useUpdateProxyGroup,
  useCustomRules,
  useSetCustomRules,
  useConfigOverwrite,
  useSetConfigOverwrite,
  useRuleProviders,
  useDeleteRuleProvider,
  useToggleRuleProvider,
  useAddRuleProvider,
  useUpdateRuleProvider,
  useCustomProxies,
  useDeleteCustomProxy,
  useToggleCustomProxy,
  useAddCustomProxy,
  useUpdateCustomProxy
} from '$lib/queries/luci'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const mockProxyGroups: ProxyGroup[] = [
  { id: 'cfg1', name: 'HK Select', type: 'select', policyFilter: '.*HK.*', enabled: true, scopeMode: 'all', scopeTargets: [] },
  { id: 'cfg2', name: 'Auto', type: 'url-test', testUrl: 'https://cp.cloudflare.com/generate_204', testInterval: '300', enabled: true, scopeMode: 'selected', scopeTargets: ['alpha.yaml'] }
]

const mockRules: CustomRule[] = [
  { type: 'DOMAIN-SUFFIX', value: 'google.com', target: 'DIRECT', scopeMode: 'all', scopeTargets: [] },
  { type: 'IP-CIDR', value: '1.1.1.1/32', target: 'HK Select', scopeMode: 'selected', scopeTargets: ['alpha.yaml'] }
]

const mockRuleProviders: RuleProvider[] = [
  { id: 'rp1', name: 'Azure_West_Europe', enabled: true, type: 'http', behavior: 'ipcidr', url: 'https://example.com/azure.yaml', interval: '86400', format: 'yaml', group: 'PROXY', position: '0', scopeMode: 'all', scopeTargets: [] },
  { id: 'rp2', name: 'BlockAds', enabled: false, type: 'http', behavior: 'domain', url: 'https://example.com/ads.yaml', interval: '86400', format: 'yaml', group: 'REJECT', position: '1', scopeMode: 'selected', scopeTargets: ['alpha.yaml'] }
]

const mockCustomProxies: CustomProxy[] = [
  { id: 'cp1', name: 'My VPS', proxyType: 'ss', server: '1.2.3.4', port: '8388', enabled: true, cipher: 'aes-256-gcm', password: 'secret', udp: true, scopeMode: 'all', scopeTargets: [] },
  { id: 'cp2', name: 'Work Server', proxyType: 'trojan', server: 'vpn.example.com', port: '443', enabled: false, password: 'pass', sni: 'vpn.example.com', scopeMode: 'selected', scopeTargets: ['alpha.yaml'] }
]

function setupMocks({
  groups = mockProxyGroups as ProxyGroup[] | undefined,
  groupsPending = false,
  rules = mockRules,
  rulesPending = false,
  providers = mockRuleProviders as RuleProvider[] | undefined,
  providersPending = false,
  addMutateAsync = vi.fn().mockResolvedValue(undefined),
  updateMutateAsync = vi.fn().mockResolvedValue(undefined),
  deleteMutateAsync = vi.fn().mockResolvedValue(undefined),
  setRulesMutateAsync = vi.fn().mockResolvedValue(undefined),
  addProviderMutateAsync = vi.fn().mockResolvedValue(undefined),
  deleteProviderMutateAsync = vi.fn().mockResolvedValue(undefined)
}: {
  groups?: ProxyGroup[] | undefined
  groupsPending?: boolean
  rules?: CustomRule[]
  rulesPending?: boolean
  providers?: RuleProvider[] | undefined
  providersPending?: boolean
  addMutateAsync?: ReturnType<typeof vi.fn>
  updateMutateAsync?: ReturnType<typeof vi.fn>
  deleteMutateAsync?: ReturnType<typeof vi.fn>
  setRulesMutateAsync?: ReturnType<typeof vi.fn>
  addProviderMutateAsync?: ReturnType<typeof vi.fn>
  deleteProviderMutateAsync?: ReturnType<typeof vi.fn>
} = {}) {
  vi.mocked(useConfigs).mockReturnValue(makeQuery([{ name: 'alpha.yaml', active: true }, { name: 'beta.yaml', active: false }]) as never)
  vi.mocked(useProxyGroups).mockReturnValue(makeQuery(groups, groupsPending) as never)
  vi.mocked(useDeleteProxyGroup).mockReturnValue(makeMutation(deleteMutateAsync) as never)
  vi.mocked(useToggleProxyGroup).mockReturnValue(makeMutation() as never)
  vi.mocked(useAddProxyGroup).mockReturnValue(makeMutation(addMutateAsync) as never)
  vi.mocked(useUpdateProxyGroup).mockReturnValue(makeMutation(updateMutateAsync) as never)
  vi.mocked(useCustomRules).mockReturnValue(makeQuery(rules, rulesPending) as never)
  vi.mocked(useSetCustomRules).mockReturnValue(makeMutation(setRulesMutateAsync) as never)
  vi.mocked(useConfigOverwrite).mockReturnValue(makeQuery<FileReadResult>({ content: '#!/bin/sh\n' }) as never)
  vi.mocked(useSetConfigOverwrite).mockReturnValue(makeMutation() as never)
  vi.mocked(useRuleProviders).mockReturnValue(makeQuery(providers, providersPending) as never)
  vi.mocked(useDeleteRuleProvider).mockReturnValue(makeMutation(deleteProviderMutateAsync) as never)
  vi.mocked(useToggleRuleProvider).mockReturnValue(makeMutation() as never)
  vi.mocked(useAddRuleProvider).mockReturnValue(makeMutation(addProviderMutateAsync) as never)
  vi.mocked(useUpdateRuleProvider).mockReturnValue(makeMutation() as never)
  vi.mocked(useCustomProxies).mockReturnValue(makeQuery(mockCustomProxies) as never)
  vi.mocked(useDeleteCustomProxy).mockReturnValue(makeMutation() as never)
  vi.mocked(useToggleCustomProxy).mockReturnValue(makeMutation() as never)
  vi.mocked(useAddCustomProxy).mockReturnValue(makeMutation() as never)
  vi.mocked(useUpdateCustomProxy).mockReturnValue(makeMutation() as never)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClashConfigTab', () => {
  beforeEach(() => vi.clearAllMocks())

  // --------------------------------------------------------------------------
  // Proxy Groups section
  // --------------------------------------------------------------------------

  describe('Custom Proxy Groups section', () => {
    it('renders existing groups from query', () => {
      setupMocks()
      render(ClashConfigTab)

      // Check via the edit button labels which are specific to the groups card
      expect(screen.getByRole('button', { name: /edit HK Select/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit Auto/i })).toBeInTheDocument()
    })

    it('shows empty state when no groups exist', () => {
      setupMocks({ groups: [] })
      render(ClashConfigTab)

      expect(screen.getByText(/no custom proxy groups yet/i)).toBeInTheDocument()
    })

    it('shows Add group button', () => {
      setupMocks()
      render(ClashConfigTab)

      expect(screen.getByRole('button', { name: /add group/i })).toBeInTheDocument()
    })

    it('opens ProxyGroupSheet when Add group is clicked', async () => {
      setupMocks()
      render(ClashConfigTab)

      await fireEvent.click(screen.getByRole('button', { name: /add group/i }))

      // Sheet dialog should appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('renders Edit and Delete buttons for each group', () => {
      setupMocks()
      render(ClashConfigTab)

      expect(screen.getByRole('button', { name: /edit HK Select/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete HK Select/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit Auto/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete Auto/i })).toBeInTheDocument()
    })

    it('calls deleteProxyGroup.mutate after two-step confirmation', async () => {
      const deleteMutateAsync = vi.fn().mockResolvedValue(undefined)
      setupMocks({ deleteMutateAsync })
      const deleteMock = makeMutation(deleteMutateAsync)
      vi.mocked(useDeleteProxyGroup).mockReturnValue({ ...deleteMock, mutate: vi.fn() } as never)

      render(ClashConfigTab)

      // First click shows Delete/Cancel
      const deleteBtn = screen.getByRole('button', { name: /delete HK Select/i })
      await fireEvent.click(deleteBtn)

      // Destructive button should now be visible
      const confirmDeleteBtn = screen.getByRole('button', { name: /^delete$/i })
      await fireEvent.click(confirmDeleteBtn)

      expect(vi.mocked(useDeleteProxyGroup)().mutate).toHaveBeenCalled()
    })

    it('renders enabled toggle for each group', () => {
      setupMocks()
      render(ClashConfigTab)

      expect(screen.getByRole('switch', { name: /disable HK Select/i })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: /disable Auto/i })).toBeInTheDocument()
    })

    it('calls toggleProxyGroup.mutate when toggle is clicked', async () => {
      const toggleMutate = vi.fn()
      setupMocks()
      vi.mocked(useToggleProxyGroup).mockReturnValue({ ...makeMutation(), mutate: toggleMutate } as never)

      render(ClashConfigTab)

      await fireEvent.click(screen.getByRole('switch', { name: /disable HK Select/i }))

      expect(toggleMutate).toHaveBeenCalledWith({ id: 'cfg1', enabled: false }, expect.anything())
    })

    it('shows disabled group as dimmed with enable toggle label', () => {
      setupMocks({
        groups: [{ id: 'cfg1', name: 'HK Select', type: 'select', enabled: false, scopeMode: 'all', scopeTargets: [] }]
      })
      render(ClashConfigTab)

      const toggle = screen.getByRole('switch', { name: /enable HK Select/i })
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    it('opens edit sheet with group data when Edit is clicked', async () => {
      setupMocks()
      render(ClashConfigTab)

      await fireEvent.click(screen.getByRole('button', { name: /edit HK Select/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      // The sheet should be in edit mode — "Save changes" button
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })

    it('shows loading state when groups are pending', () => {
      // When pending, groups data is undefined — no edit/delete buttons should render
      setupMocks({ groups: undefined, groupsPending: true })
      render(ClashConfigTab)

      // Edit/delete buttons for individual groups should not be present
      expect(screen.queryByRole('button', { name: /edit HK Select/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /edit Auto/i })).not.toBeInTheDocument()
    })
  })

  // --------------------------------------------------------------------------
  // Proxy Group form (sheet)
  // --------------------------------------------------------------------------

  describe('ProxyGroupSheet form', () => {
    it('shows validation error when name is empty on submit', async () => {
      setupMocks()
      render(ClashConfigTab)

      await fireEvent.click(screen.getByRole('button', { name: /add group/i }))
      const dialog = await waitFor(() => screen.getByRole('dialog'))

      // Submit without filling name — find the submit button within the dialog
      await fireEvent.click(within(dialog).getByRole('button', { name: /add group$/i }))

      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })

    it('shows test URL and interval fields only for url-test and fallback types', async () => {
      setupMocks()
      render(ClashConfigTab)

      await fireEvent.click(screen.getByRole('button', { name: /add group/i }))
      const dialog = await waitFor(() => screen.getByRole('dialog'))

      const typeSelect = dialog.querySelector('select#pg-type') as HTMLSelectElement

      // Default is 'select' — test fields should NOT be visible
      expect(dialog.querySelector('#pg-test-url')).not.toBeInTheDocument()
      expect(dialog.querySelector('#pg-interval')).not.toBeInTheDocument()

      // Switch to url-test — test fields should appear
      await fireEvent.change(typeSelect, { target: { value: 'url-test' } })
      expect(dialog.querySelector('#pg-test-url')).toBeInTheDocument()
      expect(dialog.querySelector('#pg-interval')).toBeInTheDocument()

      // Switch to fallback — test fields should still appear
      await fireEvent.change(typeSelect, { target: { value: 'fallback' } })
      expect(dialog.querySelector('#pg-test-url')).toBeInTheDocument()

      // Switch to load-balance — test fields should disappear
      await fireEvent.change(typeSelect, { target: { value: 'load-balance' } })
      expect(dialog.querySelector('#pg-test-url')).not.toBeInTheDocument()
    })

    it('shows test URL validation error for url-test when URL is empty', async () => {
      setupMocks()
      render(ClashConfigTab)

      await fireEvent.click(screen.getByRole('button', { name: /add group/i }))
      const dialog = await waitFor(() => screen.getByRole('dialog'))

      // Fill name, set type to url-test, but leave testUrl empty
      await fireEvent.input(within(dialog).getByLabelText(/^name$/i), {
        target: { value: 'My Group' }
      })
      await fireEvent.change(within(dialog).getByRole('combobox', { name: /^type$/i }), {
        target: { value: 'url-test' }
      })
      const submitBtn = within(dialog).getByRole('button', { name: /add group$/i })
      await fireEvent.click(submitBtn)

      expect(screen.getByText(/test url is required/i)).toBeInTheDocument()
    })

    it('calls addProxyGroup mutation on valid submit', async () => {
      const addMutateAsync = vi.fn().mockResolvedValue(undefined)
      setupMocks({ addMutateAsync })
      render(ClashConfigTab)

      await fireEvent.click(screen.getByRole('button', { name: /add group/i }))
      const dialog = await waitFor(() => screen.getByRole('dialog'))

      await fireEvent.input(within(dialog).getByLabelText(/^name$/i), {
        target: { value: 'JP Group' }
      })
      const submitBtn = within(dialog).getByRole('button', { name: /add group$/i })
      await fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(addMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'JP Group', type: 'select' })
        )
      })
    })
  })

  // --------------------------------------------------------------------------
  // Custom Rules section
  // --------------------------------------------------------------------------

  describe('Custom Rules section', () => {
    it('renders existing rules', () => {
      setupMocks()
      render(ClashConfigTab)

      expect(screen.getByText(/DOMAIN-SUFFIX,google\.com,DIRECT/)).toBeInTheDocument()
      expect(screen.getByText(/IP-CIDR,1\.1\.1\.1\/32,HK Select/)).toBeInTheDocument()
    })

    it('shows empty state when no rules exist', () => {
      setupMocks({ rules: [] })
      render(ClashConfigTab)

      expect(screen.getByText(/no custom rules yet/i)).toBeInTheDocument()
    })

    it('target dropdown includes DIRECT, REJECT and custom group names', () => {
      setupMocks()
      render(ClashConfigTab)

      const targetSelect = screen.getByRole('combobox', { name: /rule target/i })
      const options = Array.from(targetSelect.querySelectorAll('option')).map((o) => o.value)
      expect(options).toContain('DIRECT')
      expect(options).toContain('REJECT')
      expect(options).toContain('HK Select')
      expect(options).toContain('Auto')
    })

    it('shows validation error when value is empty on add', async () => {
      setupMocks()
      render(ClashConfigTab)

      await fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

      expect(screen.getByText(/value is required/i)).toBeInTheDocument()
    })

    it('adds a rule to the list when form is valid', async () => {
      setupMocks({ rules: [] })
      render(ClashConfigTab)

      await fireEvent.input(screen.getByRole('textbox', { name: /rule value/i }), {
        target: { value: 'example.com' }
      })
      await fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

      expect(screen.getByText(/DOMAIN-SUFFIX,example\.com,DIRECT/)).toBeInTheDocument()
    })

    it('renders up/down reorder buttons for each rule', () => {
      setupMocks()
      render(ClashConfigTab)

      const upBtns = screen.getAllByRole('button', { name: /move rule up/i })
      const downBtns = screen.getAllByRole('button', { name: /move rule down/i })
      expect(upBtns).toHaveLength(2)
      expect(downBtns).toHaveLength(2)
    })

    it('moves rule down when down button is clicked', async () => {
      setupMocks()
      render(ClashConfigTab)

      const downBtns = screen.getAllByRole('button', { name: /move rule down/i })
      await fireEvent.click(downBtns[0])

      // After moving, first displayed rule should be IP-CIDR
      const codeBlocks = screen.getAllByRole('code', { hidden: true })
      const texts = codeBlocks.map((el) => el.textContent?.trim())
      const ipCidrIdx = texts.findIndex((t) => t?.includes('IP-CIDR'))
      const domainSuffixIdx = texts.findIndex((t) => t?.includes('DOMAIN-SUFFIX'))
      expect(ipCidrIdx).toBeLessThan(domainSuffixIdx)
    })

    it('shows Save rules button when rules are dirty', async () => {
      setupMocks({ rules: [] })
      render(ClashConfigTab)

      // Initially no save button
      expect(screen.queryByRole('button', { name: /save rules/i })).not.toBeInTheDocument()

      // Add a rule to make it dirty
      await fireEvent.input(screen.getByRole('textbox', { name: /rule value/i }), {
        target: { value: 'test.com' }
      })
      await fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

      expect(screen.getByRole('button', { name: /save rules/i })).toBeInTheDocument()
    })

    it('calls setCustomRules mutation when Save rules is clicked', async () => {
      const setRulesMutateAsync = vi.fn().mockResolvedValue(undefined)
      setupMocks({ rules: [], setRulesMutateAsync })
      render(ClashConfigTab)

      // Add a rule then save
      await fireEvent.input(screen.getByRole('textbox', { name: /rule value/i }), {
        target: { value: 'test.com' }
      })
      await fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
      await fireEvent.click(screen.getByRole('button', { name: /save rules/i }))

      await waitFor(() => {
        expect(setRulesMutateAsync).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ type: 'DOMAIN-SUFFIX', value: 'test.com', target: 'DIRECT' })
          ])
        )
      })
    })
  })

  // --------------------------------------------------------------------------
  // Config Overwrite section
  // --------------------------------------------------------------------------

  describe('Config Overwrite section', () => {
    it('renders the Edit script button', () => {
      setupMocks()
      render(ClashConfigTab)

      expect(screen.getByRole('button', { name: /edit script/i })).toBeInTheDocument()
    })

    it('opens the config overwrite sheet when Edit script is clicked', async () => {
      setupMocks()
      render(ClashConfigTab)

      await fireEvent.click(screen.getByRole('button', { name: /edit script/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('Rule Providers section', () => {
    it('shows rule providers without using the Advanced toggle', async () => {
      setupMocks()
      render(ClashConfigTab)

      await waitFor(() => {
        expect(screen.getByText('Azure_West_Europe')).toBeInTheDocument()
        expect(screen.getByText('BlockAds')).toBeInTheDocument()
      })
    })

    it('shows empty state when no rule providers exist', async () => {
      setupMocks({ providers: [] })
      render(ClashConfigTab)

      await waitFor(() => {
        expect(screen.getByText(/no rule providers yet/i)).toBeInTheDocument()
      })
    })

    it('opens add rule provider sheet when Add provider is clicked', async () => {
      setupMocks()
      render(ClashConfigTab)

      await fireEvent.click(screen.getByRole('button', { name: /add provider/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Add Rule Provider')).toBeInTheDocument()
      })
    })

    it('opens edit rule provider sheet when Edit is clicked', async () => {
      setupMocks()
      render(ClashConfigTab)

      const editBtn = await screen.findByRole('button', { name: /edit azure_west_europe/i })
      await fireEvent.click(editBtn)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Edit Rule Provider')).toBeInTheDocument()
      })
    })

    it('shows two-step delete confirmation for rule providers', async () => {
      const deleteProviderMutateAsync = vi.fn().mockResolvedValue(undefined)
      setupMocks({ deleteProviderMutateAsync })
      const deleteMock = makeMutation(deleteProviderMutateAsync)
      vi.mocked(useDeleteRuleProvider).mockReturnValue({ ...deleteMock, mutate: vi.fn() } as never)
      render(ClashConfigTab)

      const deleteBtn = await screen.findByRole('button', { name: /delete azure_west_europe/i })
      await fireEvent.click(deleteBtn)

      // First click shows Delete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })

      await fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))

      await waitFor(() => {
        expect(vi.mocked(useDeleteRuleProvider)().mutate).toHaveBeenCalled()
      })
    })

    it('cancels rule provider delete on Cancel click', async () => {
      setupMocks()
      render(ClashConfigTab)

      const deleteBtn = await screen.findByRole('button', { name: /delete azure_west_europe/i })
      await fireEvent.click(deleteBtn)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
      })

      await fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument()
        expect(screen.getByText('Azure_West_Europe')).toBeInTheDocument()
      })
    })

  })
})
