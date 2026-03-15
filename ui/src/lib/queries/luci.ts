import {
  createQuery,
  createMutation,
  useQueryClient,
  type CreateQueryOptions,
  type CreateMutationOptions
} from '@tanstack/svelte-query'
import {
  luciRpc,
  type UciPackage,
  type UciSection,
  type ServiceStatusResult,
  type Subscription,
  type SubscriptionEditData,
  type ConfigFile,
  type FileReadResult
} from '$lib/api/luci'
import { clashClient } from '$lib/api/clash'
import { isApiError } from '$lib/api/errors'
import { toasts } from '$lib/stores/toasts'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const luciKeys = {
  all: ['luci'] as const,
  uci: (pkg: string) => [...luciKeys.all, 'uci', pkg] as const,
  serviceStatus: (name: string) => [...luciKeys.all, 'service', name, 'status'] as const,
  subscriptions: [...['luci'], 'subscriptions'] as const,
  configs: [...['luci'], 'configs'] as const,
  firewallRules: [...['luci'], 'firewall-rules'] as const,
  proxyGroups: [...['luci'], 'proxy-groups'] as const,
  customRules: [...['luci'], 'custom-rules'] as const,
  configOverwrite: [...['luci'], 'config-overwrite'] as const,
  ruleProviders: [...['luci'], 'rule-providers'] as const,
  advancedYaml: [...['luci'], 'advanced-yaml'] as const
}

// ---------------------------------------------------------------------------
// Error handler (mutations only — queries no longer support onError in v5+)
// ---------------------------------------------------------------------------

function onMutationError(err: unknown) {
  const message = isApiError(err) ? err.message : 'An unexpected error occurred'
  toasts.error(message)
}

// ---------------------------------------------------------------------------
// Queries
// v6 requires a getter function: createQuery(() => ({ ... }))
// The `as` cast is required because spreading Partial<CreateQueryOptions>
// makes required fields (queryKey, queryFn) potentially undefined, which
// doesn't match any overload. The cast is safe since we always provide them.
// ---------------------------------------------------------------------------

export function useUciConfig(pkg: string, opts?: Partial<CreateQueryOptions<UciPackage>>) {
  return createQuery<UciPackage>(() => ({
    queryKey: luciKeys.uci(pkg),
    queryFn: () => luciRpc.uciGet(pkg) as Promise<UciPackage>,
    ...opts
  } as CreateQueryOptions<UciPackage>))
}

export function useServiceStatus(
  name: string,
  opts?: Partial<CreateQueryOptions<ServiceStatusResult>>
) {
  return createQuery<ServiceStatusResult>(() => ({
    queryKey: luciKeys.serviceStatus(name),
    queryFn: () => luciRpc.serviceStatus(name),
    ...opts
  } as CreateQueryOptions<ServiceStatusResult>))
}

// ---------------------------------------------------------------------------
// Mutations
// TError is explicitly typed as `unknown` throughout so that onMutationError
// (which takes `err: unknown`) is assignable to onError without type errors.
// ---------------------------------------------------------------------------

export function useServiceStart(
  name: string,
  opts?: Partial<CreateMutationOptions<void, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, void>(() => ({
    mutationFn: () => luciRpc.serviceStart(name) as Promise<void>,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.serviceStatus(name) })
      toasts.success(`${name} started`)
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useServiceStop(
  name: string,
  opts?: Partial<CreateMutationOptions<void, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, void>(() => ({
    mutationFn: () => luciRpc.serviceStop(name) as Promise<void>,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.serviceStatus(name) })
      toasts.success(`${name} stopped`)
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useServiceRestart(
  name: string,
  opts?: Partial<CreateMutationOptions<void, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, void>(() => ({
    mutationFn: () => luciRpc.serviceRestart(name) as Promise<void>,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.serviceStatus(name) })
      toasts.success(`${name} restarted`)
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useSetUciConfig(
  pkg: string,
  section: string,
  option: string,
  opts?: Partial<CreateMutationOptions<void, unknown, string | string[]>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string | string[]>(() => ({
    mutationFn: (value: string | string[]) => luciRpc.uciSet(pkg, section, option, value) as Promise<void>,
    async onSuccess() {
      await luciRpc.uciCommit(pkg)
      queryClient.invalidateQueries({ queryKey: luciKeys.uci(pkg) })
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useSubscriptionAdd(
  opts?: Partial<CreateMutationOptions<{ name: string }, unknown, { url: string; name?: string }>>
) {
  const queryClient = useQueryClient()
  return createMutation<{ name: string }, unknown, { url: string; name?: string }>(() => ({
    mutationFn: ({ url, name }) => luciRpc.subscriptionAdd(url, name),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.uci('openclash') })
      queryClient.invalidateQueries({ queryKey: luciKeys.subscriptions })
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useSubscriptions(opts?: Partial<CreateQueryOptions<Subscription[]>>) {
  return createQuery<Subscription[]>(() => ({
    queryKey: luciKeys.subscriptions,
    queryFn: () => luciRpc.subscriptionList(),
    refetchInterval: 30_000,
    ...opts
  } as CreateQueryOptions<Subscription[]>))
}

export function useSubscriptionDelete(
  opts?: Partial<CreateMutationOptions<void, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string>(() => ({
    mutationFn: (name: string) => luciRpc.subscriptionDelete(name),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.subscriptions })
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useSubscriptionUpdate(
  opts?: Partial<CreateMutationOptions<void, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string>(() => ({
    mutationFn: (name: string) => luciRpc.subscriptionUpdate(name),
    onSuccess(_, name) {
      queryClient.invalidateQueries({ queryKey: luciKeys.subscriptions })
      toasts.success(`${name} updated`)
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useSubscriptionUpdateAll(
  opts?: Partial<CreateMutationOptions<void, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, void>(() => ({
    mutationFn: () => luciRpc.subscriptionUpdateAll(),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.subscriptions })
      toasts.success('All subscriptions updated')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useSubscriptionEdit(
  opts?: Partial<
    CreateMutationOptions<void, unknown, { name: string; data: SubscriptionEditData }>
  >
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, { name: string; data: SubscriptionEditData }>(() => ({
    mutationFn: ({ name, data }) => luciRpc.subscriptionEdit(name, data),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.subscriptions })
    },
    onError: onMutationError,
    ...opts
  }))
}

// ---------------------------------------------------------------------------
// Config file hooks
// ---------------------------------------------------------------------------

export function useConfigs(opts?: Partial<CreateQueryOptions<ConfigFile[]>>) {
  return createQuery<ConfigFile[]>(() => ({
    queryKey: luciKeys.configs,
    queryFn: () => luciRpc.configList(),
    ...opts
  } as CreateQueryOptions<ConfigFile[]>))
}

export function useConfigSetActive(
  opts?: Partial<CreateMutationOptions<void, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string>(() => ({
    mutationFn: (name: string) => luciRpc.configSetActive(name),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.configs })
      toasts.success('Config switched — Clash is restarting')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useConfigDelete(
  opts?: Partial<CreateMutationOptions<void, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string>(() => ({
    mutationFn: (name: string) => luciRpc.configDelete(name),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.configs })
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useConfigWrite(
  opts?: Partial<CreateMutationOptions<void, unknown, { name: string; content: string }>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, { name: string; content: string }>(() => ({
    mutationFn: ({ name, content }) => luciRpc.configWrite(name, content),
    onSuccess(_, { name }) {
      queryClient.invalidateQueries({ queryKey: luciKeys.configs })
      toasts.success(`${name} saved`)
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useFlushDnsCache(
  opts?: Partial<CreateMutationOptions<void, unknown, void>>
) {
  return createMutation<void, unknown, void>(() => ({
    mutationFn: () => clashClient.flushDnsCache(),
    onSuccess() {
      toasts.success('DNS cache flushed')
    },
    onError: onMutationError,
    ...opts
  }))
}

// ---------------------------------------------------------------------------
// Firewall rules file hooks
// ---------------------------------------------------------------------------

const FIREWALL_RULES_PATH = '/etc/openclash/custom/openclash_custom_firewall_rules.sh'

export function useFirewallRules(opts?: Partial<CreateQueryOptions<FileReadResult>>) {
  return createQuery<FileReadResult>(() => ({
    queryKey: luciKeys.firewallRules,
    queryFn: () => luciRpc.fileRead(FIREWALL_RULES_PATH),
    ...opts
  } as CreateQueryOptions<FileReadResult>))
}

export function useSetFirewallRules(
  opts?: Partial<CreateMutationOptions<void, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string>(() => ({
    mutationFn: (content: string) => luciRpc.fileWrite(FIREWALL_RULES_PATH, content),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.firewallRules })
      toasts.success('Firewall rules saved')
    },
    onError: onMutationError,
    ...opts
  }))
}

// ---------------------------------------------------------------------------
// Custom proxy groups (UCI sections of type "groups")
// ---------------------------------------------------------------------------

export interface ProxyGroup {
  /** UCI section ID (auto-generated) */
  id: string
  name: string
  type: 'select' | 'url-test' | 'fallback' | 'load-balance'
  testUrl?: string
  testInterval?: string
  /** Regex to filter proxy names from active subscription */
  policyFilter?: string
  /** Whether this group is injected at startup (default: true) */
  enabled: boolean
}

function sectionsToProxyGroups(pkg: UciPackage): ProxyGroup[] {
  return Object.entries(pkg)
    .filter(([, section]) => (section as UciSection & { '.type'?: string })['.type'] === 'groups')
    .filter(([, section]) => {
      const s = section as Record<string, unknown>
      return typeof s['name'] === 'string' && typeof s['type'] === 'string'
    })
    .map(([id, section]) => {
      const s = section as Record<string, string>
      return {
        id,
        name: s['name'] ?? '',
        type: (s['type'] as ProxyGroup['type']) ?? 'select',
        testUrl: s['test_url'] || undefined,
        testInterval: s['test_interval'] || undefined,
        policyFilter: s['policy_filter'] || undefined,
        // UCI bool: '0' = disabled, anything else (or absent) = enabled
        enabled: s['enabled'] !== '0'
      }
    })
}

export function useProxyGroups(opts?: Partial<CreateQueryOptions<ProxyGroup[]>>) {
  return createQuery<ProxyGroup[]>(() => ({
    queryKey: luciKeys.proxyGroups,
    queryFn: async () => {
      const pkg = (await luciRpc.uciGet('openclash')) as UciPackage
      return sectionsToProxyGroups(pkg)
    },
    ...opts
  } as CreateQueryOptions<ProxyGroup[]>))
}

export interface ProxyGroupInput {
  name: string
  type: ProxyGroup['type']
  testUrl?: string
  testInterval?: string
  policyFilter?: string
  enabled?: boolean
}

export function useAddProxyGroup(
  opts?: Partial<CreateMutationOptions<void, unknown, ProxyGroupInput>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, ProxyGroupInput>(() => ({
    mutationFn: async (input) => {
      const id = await luciRpc.uciAddSection('openclash', 'groups')
      await luciRpc.uciSet('openclash', id, 'name', input.name)
      await luciRpc.uciSet('openclash', id, 'type', input.type)
      await luciRpc.uciSet('openclash', id, 'enabled', (input.enabled ?? true) ? '1' : '0')
      if (input.testUrl) await luciRpc.uciSet('openclash', id, 'test_url', input.testUrl)
      if (input.testInterval) await luciRpc.uciSet('openclash', id, 'test_interval', input.testInterval)
      if (input.policyFilter) await luciRpc.uciSet('openclash', id, 'policy_filter', input.policyFilter)
      await luciRpc.uciCommit('openclash')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.proxyGroups })
      toasts.success('Proxy group added')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useUpdateProxyGroup(
  opts?: Partial<CreateMutationOptions<void, unknown, { id: string } & ProxyGroupInput>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, { id: string } & ProxyGroupInput>(() => ({
    mutationFn: async ({ id, ...input }) => {
      await luciRpc.uciSet('openclash', id, 'name', input.name)
      await luciRpc.uciSet('openclash', id, 'type', input.type)
      if (input.testUrl) {
        await luciRpc.uciSet('openclash', id, 'test_url', input.testUrl)
      } else {
        await luciRpc.uciDelete('openclash', id, 'test_url')
      }
      if (input.testInterval) {
        await luciRpc.uciSet('openclash', id, 'test_interval', input.testInterval)
      } else {
        await luciRpc.uciDelete('openclash', id, 'test_interval')
      }
      if (input.policyFilter) {
        await luciRpc.uciSet('openclash', id, 'policy_filter', input.policyFilter)
      } else {
        await luciRpc.uciDelete('openclash', id, 'policy_filter')
      }
      await luciRpc.uciCommit('openclash')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.proxyGroups })
      toasts.success('Proxy group updated')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useDeleteProxyGroup(
  opts?: Partial<CreateMutationOptions<void, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string>(() => ({
    mutationFn: async (id: string) => {
      await luciRpc.uciDelete('openclash', id)
      await luciRpc.uciCommit('openclash')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.proxyGroups })
      toasts.success('Proxy group deleted')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useToggleProxyGroup(
  opts?: Partial<CreateMutationOptions<void, unknown, { id: string; enabled: boolean }>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, { id: string; enabled: boolean }, { previous?: ProxyGroup[] }>(() => ({
    async onMutate({ id, enabled }) {
      // Optimistically update so the toggle feels instant
      await queryClient.cancelQueries({ queryKey: luciKeys.proxyGroups })
      const previous = queryClient.getQueryData<ProxyGroup[]>(luciKeys.proxyGroups)
      queryClient.setQueryData<ProxyGroup[]>(luciKeys.proxyGroups, (old) =>
        old?.map((g) => (g.id === id ? { ...g, enabled } : g)) ?? []
      )
      return { previous }
    },
    mutationFn: async ({ id, enabled }) => {
      await luciRpc.uciSet('openclash', id, 'enabled', enabled ? '1' : '0')
      await luciRpc.uciCommit('openclash')
    },
    onError(err, _vars, context) {
      // Roll back the optimistic update
      if (context?.previous) {
        queryClient.setQueryData(luciKeys.proxyGroups, context.previous)
      }
      onMutationError(err)
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.proxyGroups })
    },
    ...opts
  }))
}

// ---------------------------------------------------------------------------
// Custom rules file hooks
// ---------------------------------------------------------------------------

const CUSTOM_RULES_PATH = '/etc/openclash/custom/openclash_custom_rules.list'

export interface CustomRule {
  type: string
  value: string
  target: string
}

function parseCustomRules(content: string): CustomRule[] {
  const lines = content.split('\n')
  const rules: CustomRule[] = []
  let inRules = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line === 'rules:') { inRules = true; continue }
    if (!inRules) continue
    if (!line.startsWith('-')) continue
    const entry = line.replace(/^-\s*/, '').replace(/^['"]|['"]$/g, '')
    const parts = entry.split(',')
    if (parts.length >= 3) {
      rules.push({ type: parts[0].trim(), value: parts[1].trim(), target: parts[2].trim() })
    }
  }
  return rules
}

function serializeCustomRules(rules: CustomRule[]): string {
  if (rules.length === 0) return 'rules:\n'
  const lines = ['rules:']
  for (const r of rules) {
    lines.push(`  - ${r.type},${r.value},${r.target}`)
  }
  return lines.join('\n') + '\n'
}

export function useCustomRules(opts?: Partial<CreateQueryOptions<CustomRule[]>>) {
  return createQuery<CustomRule[]>(() => ({
    queryKey: luciKeys.customRules,
    queryFn: async () => {
      const result = await luciRpc.fileRead(CUSTOM_RULES_PATH)
      return parseCustomRules(result.content)
    },
    ...opts
  } as CreateQueryOptions<CustomRule[]>))
}

export function useSetCustomRules(
  opts?: Partial<CreateMutationOptions<void, unknown, CustomRule[]>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, CustomRule[]>(() => ({
    mutationFn: (rules: CustomRule[]) =>
      luciRpc.fileWrite(CUSTOM_RULES_PATH, serializeCustomRules(rules)),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.customRules })
      toasts.success('Custom rules saved')
    },
    onError: onMutationError,
    ...opts
  }))
}

// ---------------------------------------------------------------------------
// Config overwrite file hooks
// ---------------------------------------------------------------------------

const CONFIG_OVERWRITE_PATH = '/etc/openclash/custom/openclash_custom_overwrite.sh'

export function useConfigOverwrite(opts?: Partial<CreateQueryOptions<FileReadResult>>) {
  return createQuery<FileReadResult>(() => ({
    queryKey: luciKeys.configOverwrite,
    queryFn: () => luciRpc.fileRead(CONFIG_OVERWRITE_PATH),
    ...opts
  } as CreateQueryOptions<FileReadResult>))
}

export function useSetConfigOverwrite(
  opts?: Partial<CreateMutationOptions<void, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string>(() => ({
    mutationFn: (content: string) => luciRpc.fileWrite(CONFIG_OVERWRITE_PATH, content),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.configOverwrite })
      toasts.success('Config overwrite saved')
    },
    onError: onMutationError,
    ...opts
  }))
}

// ---------------------------------------------------------------------------
// Rule providers
// ---------------------------------------------------------------------------

export interface RuleProvider {
  /** UCI section ID (auto-generated) */
  id: string
  name: string
  /** Whether this provider is injected at startup (default: true) */
  enabled: boolean
  /** http = remote URL, inline = embedded YAML */
  type: 'http' | 'inline'
  /** Rule matching mode */
  behavior: 'domain' | 'ipcidr' | 'classical'
  /** Remote URL — required when type=http */
  url?: string
  /** Refresh interval in seconds (default 86400) */
  interval?: string
  /** File format (default yaml) */
  format: 'yaml' | 'text'
  /** Proxy group that matched traffic is routed to */
  group?: string
  /** Where the RULE-SET rule is inserted: 0=top (default), 1=bottom */
  position: '0' | '1'
}

export interface RuleProviderInput {
  name: string
  type: RuleProvider['type']
  behavior: RuleProvider['behavior']
  url?: string
  interval?: string
  format?: RuleProvider['format']
  group?: string
  position?: RuleProvider['position']
  enabled?: boolean
}

function sectionsToRuleProviders(pkg: UciPackage): RuleProvider[] {
  return Object.entries(pkg)
    .filter(([, section]) => (section as UciSection & { '.type'?: string })['.type'] === 'rule_providers')
    .map(([id, section]) => {
      const s = section as Record<string, string>
      return {
        id,
        name: s['name'] ?? '',
        enabled: s['enabled'] !== '0',
        type: (s['type'] as RuleProvider['type']) ?? 'http',
        behavior: (s['behavior'] as RuleProvider['behavior']) ?? 'domain',
        url: s['url'] || undefined,
        interval: s['interval'] || undefined,
        format: (s['format'] as RuleProvider['format']) ?? 'yaml',
        group: s['group'] || undefined,
        position: (s['position'] as RuleProvider['position']) ?? '0'
      }
    })
}

export function useRuleProviders(opts?: Partial<CreateQueryOptions<RuleProvider[]>>) {
  return createQuery<RuleProvider[]>(() => ({
    queryKey: luciKeys.ruleProviders,
    queryFn: async () => {
      const pkg = (await luciRpc.uciGet('openclash')) as UciPackage
      return sectionsToRuleProviders(pkg)
    },
    ...opts
  } as CreateQueryOptions<RuleProvider[]>))
}

export function useAddRuleProvider(
  opts?: Partial<CreateMutationOptions<void, unknown, RuleProviderInput>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, RuleProviderInput>(() => ({
    mutationFn: async (input) => {
      const id = await luciRpc.uciAddSection('openclash', 'rule_providers')
      await luciRpc.uciSet('openclash', id, 'name', input.name)
      await luciRpc.uciSet('openclash', id, 'type', input.type)
      await luciRpc.uciSet('openclash', id, 'behavior', input.behavior)
      await luciRpc.uciSet('openclash', id, 'enabled', (input.enabled ?? true) ? '1' : '0')
      await luciRpc.uciSet('openclash', id, 'format', input.format ?? 'yaml')
      await luciRpc.uciSet('openclash', id, 'position', input.position ?? '0')
      if (input.url) await luciRpc.uciSet('openclash', id, 'url', input.url)
      if (input.interval) await luciRpc.uciSet('openclash', id, 'interval', input.interval)
      if (input.group) await luciRpc.uciSet('openclash', id, 'group', input.group)
      await luciRpc.uciCommit('openclash')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.ruleProviders })
      toasts.success('Rule provider added')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useUpdateRuleProvider(
  opts?: Partial<CreateMutationOptions<void, unknown, { id: string } & RuleProviderInput>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, { id: string } & RuleProviderInput>(() => ({
    mutationFn: async ({ id, ...input }) => {
      await luciRpc.uciSet('openclash', id, 'name', input.name)
      await luciRpc.uciSet('openclash', id, 'type', input.type)
      await luciRpc.uciSet('openclash', id, 'behavior', input.behavior)
      await luciRpc.uciSet('openclash', id, 'format', input.format ?? 'yaml')
      await luciRpc.uciSet('openclash', id, 'position', input.position ?? '0')
      if (input.url) {
        await luciRpc.uciSet('openclash', id, 'url', input.url)
        await luciRpc.uciSet('openclash', id, 'interval', input.interval ?? '86400')
      } else {
        await luciRpc.uciDelete('openclash', id, 'url')
        await luciRpc.uciDelete('openclash', id, 'interval')
      }
      if (input.group) {
        await luciRpc.uciSet('openclash', id, 'group', input.group)
      } else {
        await luciRpc.uciDelete('openclash', id, 'group')
      }
      await luciRpc.uciCommit('openclash')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.ruleProviders })
      toasts.success('Rule provider updated')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useDeleteRuleProvider(
  opts?: Partial<CreateMutationOptions<void, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string>(() => ({
    mutationFn: async (id: string) => {
      await luciRpc.uciDelete('openclash', id)
      await luciRpc.uciCommit('openclash')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.ruleProviders })
      toasts.success('Rule provider deleted')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useToggleRuleProvider(
  opts?: Partial<CreateMutationOptions<void, unknown, { id: string; enabled: boolean }>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, { id: string; enabled: boolean }, { previous?: RuleProvider[] }>(() => ({
    async onMutate({ id, enabled }) {
      await queryClient.cancelQueries({ queryKey: luciKeys.ruleProviders })
      const previous = queryClient.getQueryData<RuleProvider[]>(luciKeys.ruleProviders)
      queryClient.setQueryData<RuleProvider[]>(luciKeys.ruleProviders, (old) =>
        old?.map((p) => (p.id === id ? { ...p, enabled } : p)) ?? []
      )
      return { previous }
    },
    mutationFn: async ({ id, enabled }) => {
      await luciRpc.uciSet('openclash', id, 'enabled', enabled ? '1' : '0')
      await luciRpc.uciCommit('openclash')
    },
    onError(err, _vars, context) {
      if (context?.previous) {
        queryClient.setQueryData(luciKeys.ruleProviders, context.previous)
      }
      onMutationError(err)
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.ruleProviders })
    },
    ...opts
  }))
}

// ---------------------------------------------------------------------------
// Advanced YAML editor
// ---------------------------------------------------------------------------

const ADVANCED_YAML_PATH = '/etc/openclash/custom/openclash_advanced_yaml.yaml'

export function useAdvancedYaml(opts?: Partial<CreateQueryOptions<FileReadResult>>) {
  return createQuery<FileReadResult>(() => ({
    queryKey: luciKeys.advancedYaml,
    queryFn: () => luciRpc.fileRead(ADVANCED_YAML_PATH),
    ...opts
  } as CreateQueryOptions<FileReadResult>))
}

export function useSetAdvancedYaml(
  opts?: Partial<CreateMutationOptions<void, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string>(() => ({
    mutationFn: (content: string) => luciRpc.fileWrite(ADVANCED_YAML_PATH, content),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.advancedYaml })
      toasts.success('Advanced YAML saved')
    },
    onError: onMutationError,
    ...opts
  }))
}
