import {
  createQuery,
  createMutation,
  useQueryClient,
  type CreateQueryOptions,
  type CreateMutationOptions
} from '@tanstack/svelte-query'
import {
  luciRpc,
  type ServiceActionResult,
  type JobCancelResult,
  type UciPackage,
  type UciSection,
  type ServiceStatusResult,
  type Subscription,
  type SubscriptionPreflightResult,
  type SubscriptionEditData,
  type ConfigFile,
  type FileReadResult,
  type ConfigCompositionResult,
  type CoreVersionResult,
  type InstalledCoreResult,
  type CoreSourceProbeResult,
  type UpdateStatusResult,
  type DashboardOption
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
  configPreview: [...['luci'], 'config-preview'] as const,
  configValidate: [...['luci'], 'config-validate'] as const,
  firewallRules: [...['luci'], 'firewall-rules'] as const,
  proxyGroups: [...['luci'], 'proxy-groups'] as const,
  customRules: [...['luci'], 'custom-rules'] as const,
  configOverwrite: [...['luci'], 'config-overwrite'] as const,
  ruleProviders: [...['luci'], 'rule-providers'] as const,
  customProxies: [...['luci'], 'custom-proxies'] as const,
  coreLatestVersion: [...['luci'], 'core-latest-version'] as const,
  coreCurrent: [...['luci'], 'core-current'] as const,
  coreUpdateStatus: [...['luci'], 'core-update-status'] as const,
  packageLatestVersion: [...['luci'], 'package-latest-version'] as const,
  packageUpdateStatus: [...['luci'], 'package-update-status'] as const,
  assetsUpdateStatus: (target: string) => [...['luci'], 'assets-update-status', target] as const,
  dashboards: [...['luci'], 'dashboards'] as const,
  dashboardUpdateStatus: (id: string) => [...['luci'], 'dashboard-update-status', id] as const,
  logService: (lines: number) => [...['luci'], 'log-service', lines] as const,
  logCore: (lines: number) => [...['luci'], 'log-core', lines] as const,
  logUpdates: (lines: number) => [...['luci'], 'log-updates', lines] as const
}

// ---------------------------------------------------------------------------
// Scope helpers
// ---------------------------------------------------------------------------

export type ScopeMode = 'all' | 'selected'

export interface ScopedCustomization {
  scopeMode: ScopeMode
  scopeTargets: string[]
}

function normaliseScopeMode(value: unknown): ScopeMode {
  return value === 'selected' ? 'selected' : 'all'
}

function normaliseScopeTargets(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value]
  }
  return []
}

function sectionScope(section: Record<string, unknown>): ScopedCustomization {
  return {
    scopeMode: normaliseScopeMode(section['scope_mode']),
    scopeTargets: normaliseScopeTargets(section['scope_targets'])
  }
}

async function writeScopeFields(id: string, input: ScopedCustomization) {
  await luciRpc.uciSet('clashnivo', id, 'scope_mode', input.scopeMode)
  if (input.scopeMode === 'selected' && input.scopeTargets.length > 0) {
    await luciRpc.uciSet('clashnivo', id, 'scope_targets', input.scopeTargets)
  } else {
    await luciRpc.uciDelete('clashnivo', id, 'scope_targets')
  }
}

export function scopeAppliesToCurrentSource(
  scopeMode: ScopeMode,
  scopeTargets: string[],
  sourceName?: string | null
): boolean {
  if (scopeMode === 'all') return true
  if (!sourceName) return false
  return scopeTargets.includes(sourceName)
}

export function isNarrowerScope(
  childMode: ScopeMode,
  childTargets: string[],
  parentMode: ScopeMode,
  parentTargets: string[]
): boolean {
  if (childMode === 'all') return parentMode !== 'all'
  if (parentMode === 'all') return false
  return childTargets.some((target) => !parentTargets.includes(target))
}

// ---------------------------------------------------------------------------
// Error handler (mutations only — queries no longer support onError in v5+)
// ---------------------------------------------------------------------------

function onMutationError(err: unknown) {
  const message = isApiError(err) ? err.message : 'An unexpected error occurred'
  toasts.error(message)
}

function isMissingRpcMethod(err: unknown, method: string) {
  return isApiError(err) && err.message === `method not found: ${method}`
}

function activeCommandLabel(activeCommand?: string) {
  return activeCommand ?? 'another command is running'
}

function notifyBusy(subject: string, activeCommand?: string) {
  toasts.info(`${subject} is busy: ${activeCommandLabel(activeCommand)}`)
}

function notifyRequested(subject: string) {
  toasts.info(subject)
}

function notifySaved(subject: string) {
  toasts.success(`${subject} saved`)
}

function notifyDeleted(subject: string) {
  toasts.success(`${subject} deleted`)
}

function titleCaseService(name: string): string {
  if (name.toLowerCase() === 'clashnivo') return 'Clash Nivo'
  return name.charAt(0).toUpperCase() + name.slice(1)
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
  opts?: Partial<CreateMutationOptions<ServiceActionResult, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<ServiceActionResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.serviceStart(name),
    onSuccess(result) {
      queryClient.invalidateQueries({ queryKey: luciKeys.serviceStatus(name) })
      if (result.busy) {
        notifyBusy(titleCaseService(name), result.active_command)
        return
      }
      notifyRequested(`Starting ${titleCaseService(name)}`)
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useServiceStop(
  name: string,
  opts?: Partial<CreateMutationOptions<ServiceActionResult, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<ServiceActionResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.serviceStop(name),
    onSuccess(result) {
      queryClient.invalidateQueries({ queryKey: luciKeys.serviceStatus(name) })
      if (result.busy) {
        notifyBusy(titleCaseService(name), result.active_command)
        return
      }
      notifyRequested(`Stopping ${titleCaseService(name)}`)
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useServiceRestart(
  name: string,
  opts?: Partial<CreateMutationOptions<ServiceActionResult, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<ServiceActionResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.serviceRestart(name),
    onSuccess(result) {
      queryClient.invalidateQueries({ queryKey: luciKeys.serviceStatus(name) })
      if (result.busy) {
        notifyBusy(titleCaseService(name), result.active_command)
        return
      }
      notifyRequested(`Restarting ${titleCaseService(name)}`)
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useServiceCancelJob(
  name: string,
  opts?: Partial<CreateMutationOptions<JobCancelResult, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<JobCancelResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.serviceCancelJob(name),
    async onSuccess(result) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: luciKeys.serviceStatus(name) }),
        queryClient.invalidateQueries({ queryKey: luciKeys.coreUpdateStatus }),
        queryClient.invalidateQueries({ queryKey: luciKeys.packageUpdateStatus }),
        queryClient.invalidateQueries({ queryKey: luciKeys.assetsUpdateStatus('all') }),
        queryClient.invalidateQueries({ queryKey: luciKeys.subscriptions })
      ])
      if (result.status === 'error') {
        toasts.error(result.message ?? 'Could not cancel the active job')
        return
      }
      notifyRequested(result.message ?? (result.accepted ? 'Cancelling active job' : 'No active job to cancel'))
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

export interface UciBatchItem {
  option: string
  value: string | string[]
}

export function useSetUciConfigBatch(
  pkg: string,
  section: string,
  opts?: Partial<CreateMutationOptions<void, unknown, UciBatchItem[]>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, UciBatchItem[]>(() => ({
    mutationFn: async (items: UciBatchItem[]) => {
      for (const item of items) {
        await luciRpc.uciSet(pkg, section, item.option, item.value)
      }
      await luciRpc.uciCommit(pkg)
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.uci(pkg) })
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useSubscriptionAdd(
  opts?: Partial<CreateMutationOptions<{ name: string; created?: boolean; duplicate?: boolean }, unknown, { url: string; name?: string }>>
) {
  const queryClient = useQueryClient()
  return createMutation<{ name: string; created?: boolean; duplicate?: boolean }, unknown, { url: string; name?: string }>(() => ({
    mutationFn: ({ url, name }) => luciRpc.subscriptionAdd(url, name),
    onSuccess(result) {
      queryClient.invalidateQueries({ queryKey: luciKeys.uci('clashnivo') })
      queryClient.invalidateQueries({ queryKey: luciKeys.subscriptions })
      if (result.duplicate) {
        toasts.info('Subscription already exists')
        return
      }
      notifySaved('Subscription')
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
      notifyDeleted('Subscription')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useSubscriptionUpdate(
  opts?: Partial<CreateMutationOptions<UpdateStatusResult, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<UpdateStatusResult, unknown, string>(() => ({
    mutationFn: async (name: string) => {
      try {
        const probe = await luciRpc.subscriptionTest(name)
        if (!probe.ok) {
          return {
            accepted: false,
            status: 'error',
            target: name,
            kind: 'subscription',
            message: probe.message,
            preflight_status: probe.status,
            preflight_http_code: probe.http_code
          } as UpdateStatusResult
        }
      } catch (err) {
        if (!isMissingRpcMethod(err, 'subscription.test')) {
          throw err
        }
      }
      return luciRpc.subscriptionUpdate(name)
    },
    onSuccess(result, name) {
      queryClient.invalidateQueries({ queryKey: luciKeys.subscriptions })
      if (result.status === 'busy') {
        notifyBusy('Sources', result.active_command)
        return
      }
      if (result.status === 'error') {
        toasts.error(result.message ?? `Subscription refresh failed: ${name}`)
        return
      }
      notifyRequested(`Refreshing ${name}`)
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useSubscriptionPreflight(
  opts?: Partial<CreateMutationOptions<SubscriptionPreflightResult, unknown, { name?: string; url?: string }>>
) {
  const queryClient = useQueryClient()
  return createMutation<SubscriptionPreflightResult, unknown, { name?: string; url?: string }>(() => ({
    mutationFn: ({ name, url }) => luciRpc.subscriptionTest(name, url),
    onSuccess(result, vars) {
      if (vars.name) {
        queryClient.invalidateQueries({ queryKey: luciKeys.subscriptions })
      }
      if (result.ok) {
        toasts.success('Subscription checked')
      } else {
        toasts.error(result.message)
      }
    },
    onError(err) {
      if (isMissingRpcMethod(err, 'subscription.test')) {
        toasts.info('Subscription check is unavailable on this backend')
        return
      }
      onMutationError(err)
    },
    ...opts
  }))
}

export function useSubscriptionUpdateAll(
  opts?: Partial<CreateMutationOptions<UpdateStatusResult, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<UpdateStatusResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.subscriptionUpdateAll(),
    onSuccess(result) {
      queryClient.invalidateQueries({ queryKey: luciKeys.subscriptions })
      if (result.status === 'busy') {
        notifyBusy('Sources', result.active_command)
        return
      }
      notifyRequested('Refreshing all sources')
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
      notifySaved('Subscription')
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
  opts?: Partial<CreateMutationOptions<void, unknown, string, { previous?: ConfigFile[] }>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string, { previous?: ConfigFile[] }>(() => ({
    async onMutate(name): Promise<{ previous?: ConfigFile[] }> {
      await queryClient.cancelQueries({ queryKey: luciKeys.configs })
      const previous = queryClient.getQueryData<ConfigFile[]>(luciKeys.configs)
      queryClient.setQueryData<ConfigFile[]>(luciKeys.configs, (old) =>
        old?.map((config) => ({ ...config, active: config.name === name })) ?? []
      )
      return { previous }
    },
    mutationFn: (name: string) => luciRpc.configSetActive(name),
    onError(err, _vars, context) {
      if (context?.previous) {
        queryClient.setQueryData(luciKeys.configs, context.previous)
      }
      onMutationError(err)
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.configs })
      toasts.success('Active source changed')
    },
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
      notifyDeleted('Source')
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
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.configs })
      notifySaved('Source')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useConfigPreview(
  opts?: Partial<CreateMutationOptions<ConfigCompositionResult, unknown, void>>
) {
  return createMutation<ConfigCompositionResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.configPreview(),
    onError: onMutationError,
    ...opts
  }))
}

export function useConfigValidate(
  opts?: Partial<CreateMutationOptions<ConfigCompositionResult, unknown, void>>
) {
  return createMutation<ConfigCompositionResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.configValidate(),
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
      toasts.success('DNS cache cleared')
    },
    onError: onMutationError,
    ...opts
  }))
}

// ---------------------------------------------------------------------------
// Firewall rules file hooks
// ---------------------------------------------------------------------------

const FIREWALL_RULES_PATH = '/etc/clashnivo/custom/clashnivo_custom_firewall_rules.sh'

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
      notifySaved('Firewall rules')
    },
    onError: onMutationError,
    ...opts
  }))
}

// ---------------------------------------------------------------------------
// Custom proxy groups (UCI sections of type "groups")
// ---------------------------------------------------------------------------

export interface ProxyGroup extends ScopedCustomization {
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
        enabled: s['enabled'] !== '0',
        ...sectionScope(section as Record<string, unknown>)
      }
    })
}

export function useProxyGroups(opts?: Partial<CreateQueryOptions<ProxyGroup[]>>) {
  return createQuery<ProxyGroup[]>(() => ({
    queryKey: luciKeys.proxyGroups,
    queryFn: async () => {
      const pkg = (await luciRpc.uciGet('clashnivo')) as UciPackage
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
  scopeMode: ScopeMode
  scopeTargets: string[]
}

export function useAddProxyGroup(
  opts?: Partial<CreateMutationOptions<void, unknown, ProxyGroupInput>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, ProxyGroupInput>(() => ({
    mutationFn: async (input) => {
      const id = await luciRpc.uciAddSection('clashnivo', 'groups')
      await luciRpc.uciSet('clashnivo', id, 'name', input.name)
      await luciRpc.uciSet('clashnivo', id, 'type', input.type)
      await luciRpc.uciSet('clashnivo', id, 'enabled', (input.enabled ?? true) ? '1' : '0')
      await writeScopeFields(id, input)
      if (input.testUrl) await luciRpc.uciSet('clashnivo', id, 'test_url', input.testUrl)
      if (input.testInterval) await luciRpc.uciSet('clashnivo', id, 'test_interval', input.testInterval)
      if (input.policyFilter) await luciRpc.uciSet('clashnivo', id, 'policy_filter', input.policyFilter)
      await luciRpc.uciCommit('clashnivo')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.proxyGroups })
      notifySaved('Proxy group')
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
      await luciRpc.uciSet('clashnivo', id, 'name', input.name)
      await luciRpc.uciSet('clashnivo', id, 'type', input.type)
      await writeScopeFields(id, input)
      if (input.testUrl) {
        await luciRpc.uciSet('clashnivo', id, 'test_url', input.testUrl)
      } else {
        await luciRpc.uciDelete('clashnivo', id, 'test_url')
      }
      if (input.testInterval) {
        await luciRpc.uciSet('clashnivo', id, 'test_interval', input.testInterval)
      } else {
        await luciRpc.uciDelete('clashnivo', id, 'test_interval')
      }
      if (input.policyFilter) {
        await luciRpc.uciSet('clashnivo', id, 'policy_filter', input.policyFilter)
      } else {
        await luciRpc.uciDelete('clashnivo', id, 'policy_filter')
      }
      await luciRpc.uciCommit('clashnivo')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.proxyGroups })
      notifySaved('Proxy group')
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
      await luciRpc.uciDelete('clashnivo', id)
      await luciRpc.uciCommit('clashnivo')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.proxyGroups })
      notifyDeleted('Proxy group')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useToggleProxyGroup(
  opts?: Partial<CreateMutationOptions<void, unknown, { id: string; enabled: boolean }, { previous?: ProxyGroup[] }>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, { id: string; enabled: boolean }, { previous?: ProxyGroup[] }>(() => ({
    async onMutate({ id, enabled }): Promise<{ previous?: ProxyGroup[] }> {
      // Optimistically update so the toggle feels instant
      await queryClient.cancelQueries({ queryKey: luciKeys.proxyGroups })
      const previous = queryClient.getQueryData<ProxyGroup[]>(luciKeys.proxyGroups)
      queryClient.setQueryData<ProxyGroup[]>(luciKeys.proxyGroups, (old) =>
        old?.map((g) => (g.id === id ? { ...g, enabled } : g)) ?? []
      )
      return { previous }
    },
    mutationFn: async ({ id, enabled }) => {
      await luciRpc.uciSet('clashnivo', id, 'enabled', enabled ? '1' : '0')
      await luciRpc.uciCommit('clashnivo')
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

const CUSTOM_RULES_PATH = '/etc/clashnivo/custom/clashnivo_custom_rules.list'

export interface CustomRule {
  type: string
  value: string
  target: string
  scopeMode: ScopeMode
  scopeTargets: string[]
}

function parseCustomRules(content: string): CustomRule[] {
  const lines = content.split('\n')
  const rules: CustomRule[] = []
  let inRules = false
  let current: Partial<CustomRule> | null = null
  let inScopeTargets = false

  function pushCurrent() {
    if (!current?.type || !current.value || !current.target) return
    rules.push({
      type: current.type,
      value: current.value,
      target: current.target,
      scopeMode: normaliseScopeMode(current.scopeMode),
      scopeTargets: normaliseScopeTargets(current.scopeTargets)
    })
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (line === 'rules:') {
      inRules = true
      continue
    }
    if (!inRules) continue

    if (current && inScopeTargets && line.startsWith('- ')) {
      current.scopeTargets = [...(current.scopeTargets ?? []), line.replace(/^- /, '').trim()]
      continue
    }

    if (line.startsWith('- ')) {
      pushCurrent()
      current = { scopeMode: 'all', scopeTargets: [] }
      inScopeTargets = false

      const payload = line.replace(/^- /, '')
      if (payload.startsWith('type:')) {
        current.type = payload.replace(/^type:\s*/, '').trim()
      } else {
        const entry = payload.replace(/^['"]|['"]$/g, '')
        const parts = entry.split(',')
        if (parts.length >= 3) {
          current.type = parts[0].trim()
          current.value = parts[1].trim()
          current.target = parts.slice(2).join(',').trim()
        }
      }
      continue
    }

    if (!current) continue

    if (line === 'scope_targets:') {
      current.scopeTargets = []
      inScopeTargets = true
      continue
    }

    inScopeTargets = false
    if (line.startsWith('type:')) current.type = line.replace(/^type:\s*/, '').trim()
    else if (line.startsWith('value:')) current.value = line.replace(/^value:\s*/, '').trim()
    else if (line.startsWith('target:')) current.target = line.replace(/^target:\s*/, '').trim()
    else if (line.startsWith('scope_mode:')) current.scopeMode = normaliseScopeMode(line.replace(/^scope_mode:\s*/, '').trim())
  }

  pushCurrent()
  return rules
}

function serializeCustomRules(rules: CustomRule[]): string {
  const lines = ['rules:']
  for (const rule of rules) {
    lines.push('  - type: ' + rule.type)
    lines.push('    value: ' + rule.value)
    lines.push('    target: ' + rule.target)
    lines.push('    scope_mode: ' + normaliseScopeMode(rule.scopeMode))
    if (rule.scopeMode === 'selected' && rule.scopeTargets.length > 0) {
      lines.push('    scope_targets:')
      for (const target of rule.scopeTargets) {
        lines.push('      - ' + target)
      }
    }
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
      notifySaved('Custom rules')
    },
    onError: onMutationError,
    ...opts
  }))
}

// ---------------------------------------------------------------------------
// Config overwrite file hooks
// ---------------------------------------------------------------------------

const CONFIG_OVERWRITE_PATH = '/etc/clashnivo/custom/clashnivo_custom_overwrite.sh'

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
      notifySaved('Overwrite')
    },
    onError: onMutationError,
    ...opts
  }))
}

// ---------------------------------------------------------------------------
// Rule providers
// ---------------------------------------------------------------------------

export interface RuleProvider extends ScopedCustomization {
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
  scopeMode: ScopeMode
  scopeTargets: string[]
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
        position: (s['position'] as RuleProvider['position']) ?? '0',
        ...sectionScope(section as Record<string, unknown>)
      }
    })
}

export function useRuleProviders(opts?: Partial<CreateQueryOptions<RuleProvider[]>>) {
  return createQuery<RuleProvider[]>(() => ({
    queryKey: luciKeys.ruleProviders,
    queryFn: async () => {
      const pkg = (await luciRpc.uciGet('clashnivo')) as UciPackage
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
      const id = await luciRpc.uciAddSection('clashnivo', 'rule_providers')
      await luciRpc.uciSet('clashnivo', id, 'name', input.name)
      await luciRpc.uciSet('clashnivo', id, 'type', input.type)
      await luciRpc.uciSet('clashnivo', id, 'behavior', input.behavior)
      await luciRpc.uciSet('clashnivo', id, 'enabled', (input.enabled ?? true) ? '1' : '0')
      await luciRpc.uciSet('clashnivo', id, 'format', input.format ?? 'yaml')
      await luciRpc.uciSet('clashnivo', id, 'position', input.position ?? '0')
      await writeScopeFields(id, input)
      if (input.url) await luciRpc.uciSet('clashnivo', id, 'url', input.url)
      if (input.interval) await luciRpc.uciSet('clashnivo', id, 'interval', input.interval)
      if (input.group) await luciRpc.uciSet('clashnivo', id, 'group', input.group)
      await luciRpc.uciCommit('clashnivo')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.ruleProviders })
      notifySaved('Rule provider')
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
      await luciRpc.uciSet('clashnivo', id, 'name', input.name)
      await luciRpc.uciSet('clashnivo', id, 'type', input.type)
      await luciRpc.uciSet('clashnivo', id, 'behavior', input.behavior)
      await luciRpc.uciSet('clashnivo', id, 'format', input.format ?? 'yaml')
      await luciRpc.uciSet('clashnivo', id, 'position', input.position ?? '0')
      await writeScopeFields(id, input)
      if (input.url) {
        await luciRpc.uciSet('clashnivo', id, 'url', input.url)
        await luciRpc.uciSet('clashnivo', id, 'interval', input.interval ?? '86400')
      } else {
        await luciRpc.uciDelete('clashnivo', id, 'url')
        await luciRpc.uciDelete('clashnivo', id, 'interval')
      }
      if (input.group) {
        await luciRpc.uciSet('clashnivo', id, 'group', input.group)
      } else {
        await luciRpc.uciDelete('clashnivo', id, 'group')
      }
      await luciRpc.uciCommit('clashnivo')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.ruleProviders })
      notifySaved('Rule provider')
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
      await luciRpc.uciDelete('clashnivo', id)
      await luciRpc.uciCommit('clashnivo')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.ruleProviders })
      notifyDeleted('Rule provider')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useToggleRuleProvider(
  opts?: Partial<CreateMutationOptions<void, unknown, { id: string; enabled: boolean }, { previous?: RuleProvider[] }>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, { id: string; enabled: boolean }, { previous?: RuleProvider[] }>(() => ({
    async onMutate({ id, enabled }): Promise<{ previous?: RuleProvider[] }> {
      await queryClient.cancelQueries({ queryKey: luciKeys.ruleProviders })
      const previous = queryClient.getQueryData<RuleProvider[]>(luciKeys.ruleProviders)
      queryClient.setQueryData<RuleProvider[]>(luciKeys.ruleProviders, (old) =>
        old?.map((p) => (p.id === id ? { ...p, enabled } : p)) ?? []
      )
      return { previous }
    },
    mutationFn: async ({ id, enabled }) => {
      await luciRpc.uciSet('clashnivo', id, 'enabled', enabled ? '1' : '0')
      await luciRpc.uciCommit('clashnivo')
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
// Core management
// ---------------------------------------------------------------------------

export function useCoreLatestVersion(opts?: Partial<CreateQueryOptions<CoreVersionResult>>) {
  return createQuery<CoreVersionResult>(() => ({
    queryKey: luciKeys.coreLatestVersion,
    queryFn: () => luciRpc.coreLatestVersion(),
    staleTime: 60 * 60 * 1000,
    retry: false,
    ...opts
  } as CreateQueryOptions<CoreVersionResult>))
}

export function useCoreCurrent(opts?: Partial<CreateQueryOptions<InstalledCoreResult>>) {
  return createQuery<InstalledCoreResult>(() => ({
    queryKey: luciKeys.coreCurrent,
    queryFn: () => luciRpc.coreCurrent(),
    retry: false,
    ...opts
  } as CreateQueryOptions<InstalledCoreResult>))
}

export function useCoreRefreshLatestVersion(
  opts?: Partial<CreateMutationOptions<CoreVersionResult, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<CoreVersionResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.coreRefreshLatestVersion(),
    onSuccess(result) {
      queryClient.invalidateQueries({ queryKey: luciKeys.coreLatestVersion })
      if (result.status === 'error') {
        toasts.error('Could not check core version')
        return
      }
      toasts.success('Core version checked')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useCoreProbeSources(
  opts?: Partial<CreateMutationOptions<CoreSourceProbeResult, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<CoreSourceProbeResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.coreProbeSources(),
    onSuccess(result) {
      queryClient.invalidateQueries({ queryKey: luciKeys.coreLatestVersion })
      queryClient.invalidateQueries({ queryKey: luciKeys.uci('clashnivo') })
      if (result.status === 'busy') {
        notifyBusy('Download source', result.active_command)
      } else if (result.status === 'error') {
        toasts.error('No healthy download source was found')
      } else {
        toasts.success(`Download source checked: ${result.selected_source_label ?? result.selected_source ?? 'selected'}`)
      }
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useCoreUpdateStatus(
  opts?: Partial<CreateQueryOptions<UpdateStatusResult>>
) {
  return createQuery<UpdateStatusResult>(() => ({
    queryKey: luciKeys.coreUpdateStatus,
    queryFn: () => luciRpc.coreUpdateStatus(),
    retry: false,
    ...opts
  } as CreateQueryOptions<UpdateStatusResult>))
}

export function useCoreUpdate(
  opts?: Partial<CreateMutationOptions<UpdateStatusResult, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<UpdateStatusResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.coreUpdate(),
    onSuccess(result) {
      // Invalidate both so version + status refresh after update completes
      queryClient.invalidateQueries({ queryKey: luciKeys.coreLatestVersion })
      queryClient.invalidateQueries({ queryKey: luciKeys.coreUpdateStatus })
      if (result.status === 'busy') {
        notifyBusy('Core update', result.active_command)
        return
      }
      notifyRequested('Starting core update')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function usePackageLatestVersion(opts?: Partial<CreateQueryOptions<CoreVersionResult>>) {
  return createQuery<CoreVersionResult>(() => ({
    queryKey: luciKeys.packageLatestVersion,
    queryFn: () => luciRpc.packageLatestVersion(),
    staleTime: 60 * 60 * 1000,
    retry: false,
    ...opts
  } as CreateQueryOptions<CoreVersionResult>))
}

export function usePackageRefreshLatestVersion(
  opts?: Partial<CreateMutationOptions<CoreVersionResult, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<CoreVersionResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.packageRefreshLatestVersion(),
    onSuccess(result) {
      queryClient.invalidateQueries({ queryKey: luciKeys.packageLatestVersion })
      if (result.status === 'error') {
        toasts.error('Could not check package version')
        return
      }
      toasts.success('Package version checked')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function usePackageUpdateStatus(
  opts?: Partial<CreateQueryOptions<UpdateStatusResult>>
) {
  return createQuery<UpdateStatusResult>(() => ({
    queryKey: luciKeys.packageUpdateStatus,
    queryFn: () => luciRpc.packageUpdateStatus(),
    retry: false,
    ...opts
  } as CreateQueryOptions<UpdateStatusResult>))
}

export function usePackageUpdate(
  opts?: Partial<CreateMutationOptions<UpdateStatusResult, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<UpdateStatusResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.packageUpdate(),
    onSuccess(result) {
      queryClient.invalidateQueries({ queryKey: luciKeys.packageLatestVersion })
      queryClient.invalidateQueries({ queryKey: luciKeys.packageUpdateStatus })
      if (result.status === 'busy') {
        notifyBusy('Package update', result.active_command)
        return
      }
      notifyRequested('Starting package update')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useAssetsUpdateStatus(
  target = 'all',
  opts?: Partial<CreateQueryOptions<UpdateStatusResult>>
) {
  return createQuery<UpdateStatusResult>(() => ({
    queryKey: luciKeys.assetsUpdateStatus(target),
    queryFn: () => luciRpc.assetsUpdateStatus(target),
    retry: false,
    ...opts
  } as CreateQueryOptions<UpdateStatusResult>))
}

export function useAssetsUpdate(
  target = 'all',
  opts?: Partial<CreateMutationOptions<UpdateStatusResult, unknown, void>>
) {
  const queryClient = useQueryClient()
  return createMutation<UpdateStatusResult, unknown, void>(() => ({
    mutationFn: () => luciRpc.assetsUpdate(target),
    onSuccess(result) {
      queryClient.invalidateQueries({ queryKey: luciKeys.assetsUpdateStatus(target) })
      if (result.status === 'busy') {
        notifyBusy('Asset refresh', result.active_command)
        return
      }
      notifyRequested(
        target === 'all' ? 'Refreshing assets' : `Refreshing assets: ${target}`
      )
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useDashboards(opts?: Partial<CreateQueryOptions<DashboardOption[]>>) {
  return createQuery<DashboardOption[]>(() => ({
    queryKey: luciKeys.dashboards,
    queryFn: () => luciRpc.dashboardList(),
    ...opts
  } as CreateQueryOptions<DashboardOption[]>))
}

export function useDashboardUpdateStatus(
  id: string | (() => string),
  opts?: Partial<CreateQueryOptions<UpdateStatusResult>>
) {
  return createQuery<UpdateStatusResult>(() => ({
    queryKey: luciKeys.dashboardUpdateStatus(typeof id === 'function' ? id() : id),
    queryFn: () => luciRpc.dashboardUpdateStatus(typeof id === 'function' ? id() : id),
    retry: false,
    ...opts
  } as CreateQueryOptions<UpdateStatusResult>))
}

export function useDashboardSelect(
  opts?: Partial<CreateMutationOptions<void, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string>(() => ({
    mutationFn: (id: string) => luciRpc.dashboardSelect(id),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.dashboards })
      queryClient.invalidateQueries({ queryKey: luciKeys.uci('clashnivo') })
      notifySaved('Dashboard')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useDashboardUpdate(
  opts?: Partial<CreateMutationOptions<UpdateStatusResult, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<UpdateStatusResult, unknown, string>(() => ({
    mutationFn: (id: string) => luciRpc.dashboardUpdate(id),
    onSuccess(result, id) {
      queryClient.invalidateQueries({ queryKey: luciKeys.dashboardUpdateStatus(id) })
      queryClient.invalidateQueries({ queryKey: luciKeys.dashboards })
      if (result.status === 'busy') {
        notifyBusy('Dashboard download', result.active_command)
        return
      }
      notifyRequested('Starting dashboard download')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useLogService(
  lines: number,
  opts?: Partial<CreateQueryOptions<string>>
) {
  return createQuery<string>(() => ({
    queryKey: luciKeys.logService(lines),
    queryFn: () => luciRpc.logService(lines),
    retry: false,
    ...opts
  } as CreateQueryOptions<string>))
}

export function useLogCore(
  lines: number,
  opts?: Partial<CreateQueryOptions<string>>
) {
  return createQuery<string>(() => ({
    queryKey: luciKeys.logCore(lines),
    queryFn: () => luciRpc.logCore(lines),
    retry: false,
    ...opts
  } as CreateQueryOptions<string>))
}

// ---------------------------------------------------------------------------
// Custom proxies
// ---------------------------------------------------------------------------

export interface CustomProxy extends ScopedCustomization {
  /** UCI section ID (auto-generated) */
  id: string
  name: string
  /** Whether this proxy is injected at startup (default: true) */
  enabled: boolean
  /** Clash proxy protocol */
  proxyType: 'ss' | 'trojan' | 'vmess' | 'vless'
  server: string
  port: string
  // SS fields
  cipher?: string
  password?: string
  udp?: boolean
  // Trojan fields
  // password shared with SS
  sni?: string
  skipCertVerify?: boolean
  // VMess fields
  uuid?: string
  alterId?: string
  // VMess cipher (defaults to auto)
  vmessCipher?: string
  tls?: boolean
  // VLESS fields
  // uuid shared with VMess
  // tls shared with VMess
  // sni shared with Trojan
  flow?: string
}

export interface CustomProxyInput {
  name: string
  proxyType: CustomProxy['proxyType']
  server: string
  port: string
  enabled?: boolean
  scopeMode: ScopeMode
  scopeTargets: string[]
  cipher?: string
  password?: string
  udp?: boolean
  sni?: string
  skipCertVerify?: boolean
  uuid?: string
  alterId?: string
  vmessCipher?: string
  tls?: boolean
  flow?: string
}

function sectionsToCustomProxies(pkg: UciPackage): CustomProxy[] {
  return Object.entries(pkg)
    .filter(([, section]) => (section as UciSection & { '.type'?: string })['.type'] === 'custom_proxy')
    .filter(([, section]) => {
      const s = section as Record<string, unknown>
      return typeof s['name'] === 'string' && typeof s['proxy_type'] === 'string'
    })
    .map(([id, section]) => {
      const s = section as Record<string, string>
      return {
        id,
        name: s['name'] ?? '',
        enabled: s['enabled'] !== '0',
        proxyType: (s['proxy_type'] as CustomProxy['proxyType']) ?? 'ss',
        server: s['server'] ?? '',
        port: s['port'] ?? '',
        cipher: s['cipher'] || undefined,
        password: s['password'] || undefined,
        udp: s['udp'] === '1',
        sni: s['sni'] || undefined,
        skipCertVerify: s['skip_cert_verify'] === '1',
        uuid: s['uuid'] || undefined,
        alterId: s['alter_id'] || undefined,
        vmessCipher: s['vmess_cipher'] || undefined,
        tls: s['tls'] === '1',
        flow: s['flow'] || undefined,
        ...sectionScope(section as Record<string, unknown>)
      }
    })
}

export function useCustomProxies(opts?: Partial<CreateQueryOptions<CustomProxy[]>>) {
  return createQuery<CustomProxy[]>(() => ({
    queryKey: luciKeys.customProxies,
    queryFn: async () => {
      const pkg = (await luciRpc.uciGet('clashnivo')) as UciPackage
      return sectionsToCustomProxies(pkg)
    },
    ...opts
  } as CreateQueryOptions<CustomProxy[]>))
}

export function useAddCustomProxy(
  opts?: Partial<CreateMutationOptions<void, unknown, CustomProxyInput>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, CustomProxyInput>(() => ({
    mutationFn: async (input) => {
      const id = await luciRpc.uciAddSection('clashnivo', 'custom_proxy')
      await luciRpc.uciSet('clashnivo', id, 'name', input.name)
      await luciRpc.uciSet('clashnivo', id, 'proxy_type', input.proxyType)
      await luciRpc.uciSet('clashnivo', id, 'server', input.server)
      await luciRpc.uciSet('clashnivo', id, 'port', input.port)
      await luciRpc.uciSet('clashnivo', id, 'enabled', (input.enabled ?? true) ? '1' : '0')
      await writeScopeFields(id, input)
      if (input.cipher) await luciRpc.uciSet('clashnivo', id, 'cipher', input.cipher)
      if (input.password) await luciRpc.uciSet('clashnivo', id, 'password', input.password)
      if (input.udp) await luciRpc.uciSet('clashnivo', id, 'udp', '1')
      if (input.sni) await luciRpc.uciSet('clashnivo', id, 'sni', input.sni)
      if (input.skipCertVerify) await luciRpc.uciSet('clashnivo', id, 'skip_cert_verify', '1')
      if (input.uuid) await luciRpc.uciSet('clashnivo', id, 'uuid', input.uuid)
      if (input.alterId) await luciRpc.uciSet('clashnivo', id, 'alter_id', input.alterId)
      if (input.vmessCipher) await luciRpc.uciSet('clashnivo', id, 'vmess_cipher', input.vmessCipher)
      if (input.tls) await luciRpc.uciSet('clashnivo', id, 'tls', '1')
      if (input.flow) await luciRpc.uciSet('clashnivo', id, 'flow', input.flow)
      await luciRpc.uciCommit('clashnivo')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.customProxies })
      notifySaved('Custom proxy')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useUpdateCustomProxy(
  opts?: Partial<CreateMutationOptions<void, unknown, { id: string } & CustomProxyInput>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, { id: string } & CustomProxyInput>(() => ({
    mutationFn: async ({ id, ...input }) => {
      await luciRpc.uciSet('clashnivo', id, 'name', input.name)
      await luciRpc.uciSet('clashnivo', id, 'proxy_type', input.proxyType)
      await luciRpc.uciSet('clashnivo', id, 'server', input.server)
      await luciRpc.uciSet('clashnivo', id, 'port', input.port)
      await writeScopeFields(id, input)

      // Write optional fields or delete if cleared
      const optFields: Array<[string, string | undefined]> = [
        ['cipher', input.cipher],
        ['password', input.password],
        ['sni', input.sni],
        ['uuid', input.uuid],
        ['alter_id', input.alterId],
        ['vmess_cipher', input.vmessCipher],
        ['flow', input.flow]
      ]
      for (const [key, val] of optFields) {
        if (val) {
          await luciRpc.uciSet('clashnivo', id, key, val)
        } else {
          await luciRpc.uciDelete('clashnivo', id, key)
        }
      }

      const boolFields: Array<[string, boolean | undefined]> = [
        ['udp', input.udp],
        ['skip_cert_verify', input.skipCertVerify],
        ['tls', input.tls]
      ]
      for (const [key, val] of boolFields) {
        if (val) {
          await luciRpc.uciSet('clashnivo', id, key, '1')
        } else {
          await luciRpc.uciDelete('clashnivo', id, key)
        }
      }

      await luciRpc.uciCommit('clashnivo')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.customProxies })
      notifySaved('Custom proxy')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useDeleteCustomProxy(
  opts?: Partial<CreateMutationOptions<void, unknown, string>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string>(() => ({
    mutationFn: async (id: string) => {
      await luciRpc.uciDelete('clashnivo', id)
      await luciRpc.uciCommit('clashnivo')
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.customProxies })
      notifyDeleted('Custom proxy')
    },
    onError: onMutationError,
    ...opts
  }))
}

export function useToggleCustomProxy(
  opts?: Partial<CreateMutationOptions<void, unknown, { id: string; enabled: boolean }, { previous?: CustomProxy[] }>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, { id: string; enabled: boolean }, { previous?: CustomProxy[] }>(() => ({
    async onMutate({ id, enabled }): Promise<{ previous?: CustomProxy[] }> {
      await queryClient.cancelQueries({ queryKey: luciKeys.customProxies })
      const previous = queryClient.getQueryData<CustomProxy[]>(luciKeys.customProxies)
      queryClient.setQueryData<CustomProxy[]>(luciKeys.customProxies, (old) =>
        old?.map((p) => (p.id === id ? { ...p, enabled } : p)) ?? []
      )
      return { previous }
    },
    mutationFn: async ({ id, enabled }) => {
      await luciRpc.uciSet('clashnivo', id, 'enabled', enabled ? '1' : '0')
      await luciRpc.uciCommit('clashnivo')
    },
    onError(err, _vars, context) {
      if (context?.previous) {
        queryClient.setQueryData(luciKeys.customProxies, context.previous)
      }
      onMutationError(err)
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.customProxies })
    },
    ...opts
  }))
}
