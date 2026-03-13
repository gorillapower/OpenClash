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
  type ServiceStatusResult,
  type Subscription,
  type SubscriptionEditData,
  type ConfigFile
} from '$lib/api/luci'
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
  configs: [...['luci'], 'configs'] as const
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
