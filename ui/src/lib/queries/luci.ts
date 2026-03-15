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
  configOverwrite: [...['luci'], 'config-overwrite'] as const
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
}

function sectionsToProxyGroups(pkg: UciPackage): ProxyGroup[] {
  return Object.entries(pkg)
    .filter(([, section]) => (section as UciSection & { '.type'?: string })['.type'] === 'groups' || true)
    .filter(([id, section]) => {
      const s = section as Record<string, unknown>
      return s['name'] !== undefined || id !== 'config'
    })
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
        policyFilter: s['policy_filter'] || undefined
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
