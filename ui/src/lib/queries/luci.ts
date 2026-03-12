import {
  createQuery,
  createMutation,
  useQueryClient,
  type CreateQueryOptions,
  type CreateMutationOptions
} from '@tanstack/svelte-query'
import { luciRpc, type UciPackage, type ServiceStatusResult } from '$lib/api/luci'
import { isApiError } from '$lib/api/errors'
import { toasts } from '$lib/stores/toasts'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const luciKeys = {
  all: ['luci'] as const,
  uci: (pkg: string) => [...luciKeys.all, 'uci', pkg] as const,
  serviceStatus: (name: string) => [...luciKeys.all, 'service', name, 'status'] as const
}

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

function onQueryError(err: unknown) {
  const message = isApiError(err) ? err.message : 'An unexpected error occurred'
  toasts.error(message)
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useUciConfig(pkg: string, opts?: Partial<CreateQueryOptions<UciPackage>>) {
  return createQuery<UciPackage>({
    queryKey: luciKeys.uci(pkg),
    queryFn: () => luciRpc.uciGet(pkg) as Promise<UciPackage>,
    onError: onQueryError,
    ...opts
  })
}

export function useServiceStatus(
  name: string,
  opts?: Partial<CreateQueryOptions<ServiceStatusResult>>
) {
  return createQuery<ServiceStatusResult>({
    queryKey: luciKeys.serviceStatus(name),
    queryFn: () => luciRpc.serviceStatus(name),
    onError: onQueryError,
    ...opts
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useServiceStart(name: string, opts?: Partial<CreateMutationOptions>) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, void>({
    mutationFn: () => luciRpc.serviceStart(name),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.serviceStatus(name) })
      toasts.success(`${name} started`)
    },
    onError: onQueryError,
    ...opts
  })
}

export function useServiceStop(name: string, opts?: Partial<CreateMutationOptions>) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, void>({
    mutationFn: () => luciRpc.serviceStop(name),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.serviceStatus(name) })
      toasts.success(`${name} stopped`)
    },
    onError: onQueryError,
    ...opts
  })
}

export function useServiceRestart(name: string, opts?: Partial<CreateMutationOptions>) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, void>({
    mutationFn: () => luciRpc.serviceRestart(name),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: luciKeys.serviceStatus(name) })
      toasts.success(`${name} restarted`)
    },
    onError: onQueryError,
    ...opts
  })
}

export function useSetUciConfig(
  pkg: string,
  section: string,
  option: string,
  opts?: Partial<CreateMutationOptions<void, unknown, string | string[]>>
) {
  const queryClient = useQueryClient()
  return createMutation<void, unknown, string | string[]>({
    mutationFn: (value) => luciRpc.uciSet(pkg, section, option, value),
    async onSuccess() {
      await luciRpc.uciCommit(pkg)
      queryClient.invalidateQueries({ queryKey: luciKeys.uci(pkg) })
    },
    onError: onQueryError,
    ...opts
  })
}
