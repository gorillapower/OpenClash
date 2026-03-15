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
  useProxyGroups: vi.fn(),
  useDeleteProxyGroup: vi.fn(),
  useAddProxyGroup: vi.fn(),
  useUpdateProxyGroup: vi.fn(),
  useCustomRules: vi.fn(),
  useSetCustomRules: vi.fn(),
  useConfigOverwrite: vi.fn(),
  useSetConfigOverwrite: vi.fn()
}))

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/svelte-query')>()
  return { ...actual, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })) }
})

import type { ProxyGroup, CustomRule } from '$lib/queries/luci'
import {
  useProxyGroups,
  useDeleteProxyGroup,
  useAddProxyGroup,
  useUpdateProxyGroup,
  useCustomRules,
  useSetCustomRules,
  useConfigOverwrite,
  useSetConfigOverwrite
} from '$lib/queries/luci'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const mockProxyGroups: ProxyGroup[] = [
  { id: 'cfg1', name: 'HK Select', type: 'select', policyFilter: '.*HK.*' },
  { id: 'cfg2', name: 'Auto', type: 'url-test', testUrl: 'https://cp.cloudflare.com/generate_204', testInterval: '300' }
]

const mockRules: CustomRule[] = [
  { type: 'DOMAIN-SUFFIX', value: 'google.com', target: 'DIRECT' },
  { type: 'IP-CIDR', value: '1.1.1.1/32', target: 'HK Select' }
]

function setupMocks({
  groups = mockProxyGroups as ProxyGroup[] | undefined,
  groupsPending = false,
  rules = mockRules,
  rulesPending = false,
  addMutateAsync = vi.fn().mockResolvedValue(undefined),
  updateMutateAsync = vi.fn().mockResolvedValue(undefined),
  deleteMutateAsync = vi.fn().mockResolvedValue(undefined),
  setRulesMutateAsync = vi.fn().mockResolvedValue(undefined)
}: {
  groups?: ProxyGroup[] | undefined
  groupsPending?: boolean
  rules?: CustomRule[]
  rulesPending?: boolean
  addMutateAsync?: ReturnType<typeof vi.fn>
  updateMutateAsync?: ReturnType<typeof vi.fn>
  deleteMutateAsync?: ReturnType<typeof vi.fn>
  setRulesMutateAsync?: ReturnType<typeof vi.fn>
} = {}) {
  vi.mocked(useProxyGroups).mockReturnValue(makeQuery(groups, groupsPending) as never)
  vi.mocked(useDeleteProxyGroup).mockReturnValue(makeMutation(deleteMutateAsync) as never)
  vi.mocked(useAddProxyGroup).mockReturnValue(makeMutation(addMutateAsync) as never)
  vi.mocked(useUpdateProxyGroup).mockReturnValue(makeMutation(updateMutateAsync) as never)
  vi.mocked(useCustomRules).mockReturnValue(makeQuery(rules, rulesPending) as never)
  vi.mocked(useSetCustomRules).mockReturnValue(makeMutation(setRulesMutateAsync) as never)
  vi.mocked(useConfigOverwrite).mockReturnValue(makeQuery<FileReadResult>({ content: '#!/bin/sh\n' }) as never)
  vi.mocked(useSetConfigOverwrite).mockReturnValue(makeMutation() as never)
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

    it('calls deleteProxyGroup.mutate when Delete is clicked', async () => {
      const deleteMutateAsync = vi.fn().mockResolvedValue(undefined)
      setupMocks({ deleteMutateAsync })
      // Need to get the mutate fn from the mock
      const deleteMock = makeMutation(deleteMutateAsync)
      vi.mocked(useDeleteProxyGroup).mockReturnValue({ ...deleteMock, mutate: vi.fn() } as never)

      render(ClashConfigTab)

      const deleteBtn = screen.getByRole('button', { name: /delete HK Select/i })
      await fireEvent.click(deleteBtn)

      // The mutate fn on the returned mock should have been called
      expect(vi.mocked(useDeleteProxyGroup)().mutate).toHaveBeenCalled()
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
})
