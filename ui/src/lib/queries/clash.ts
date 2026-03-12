import {
  createQuery,
  type CreateQueryOptions,
  type QueryClient
} from '@tanstack/svelte-query'
import { clashClient, type ClashVersion, type ClashConfig, type ProxiesResponse, type ConnectionsResponse } from '$lib/api/clash'
import { isApiError } from '$lib/api/errors'
import { toasts } from '$lib/stores/toasts'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const clashKeys = {
  all: ['clash'] as const,
  version: () => [...clashKeys.all, 'version'] as const,
  config: () => [...clashKeys.all, 'config'] as const,
  proxies: () => [...clashKeys.all, 'proxies'] as const,
  connections: () => [...clashKeys.all, 'connections'] as const,
  status: () => [...clashKeys.all, 'status'] as const
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

export function useClashVersion(opts?: Partial<CreateQueryOptions<ClashVersion>>) {
  return createQuery<ClashVersion>({
    queryKey: clashKeys.version(),
    queryFn: () => clashClient.getVersion(),
    onError: onQueryError,
    ...opts
  })
}

export function useClashConfig(opts?: Partial<CreateQueryOptions<ClashConfig>>) {
  return createQuery<ClashConfig>({
    queryKey: clashKeys.config(),
    queryFn: () => clashClient.getConfig(),
    onError: onQueryError,
    ...opts
  })
}

export function useProxies(opts?: Partial<CreateQueryOptions<ProxiesResponse>>) {
  return createQuery<ProxiesResponse>({
    queryKey: clashKeys.proxies(),
    queryFn: () => clashClient.getProxies(),
    onError: onQueryError,
    ...opts
  })
}

export function useConnections(opts?: Partial<CreateQueryOptions<ConnectionsResponse>>) {
  return createQuery<ConnectionsResponse>({
    queryKey: clashKeys.connections(),
    queryFn: () => clashClient.getConnections(),
    onError: onQueryError,
    ...opts
  })
}

/**
 * Polls Clash running status every 5 seconds.
 * "Status" is derived from /version — if it resolves, Clash is running.
 */
export function useClashStatus(opts?: Partial<CreateQueryOptions<ClashVersion>>) {
  return createQuery<ClashVersion>({
    queryKey: clashKeys.status(),
    queryFn: () => clashClient.getVersion(),
    refetchInterval: 5000,
    retry: false,
    onError: undefined, // status polling failures are silent
    ...opts
  })
}

export function invalidateClash(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: clashKeys.all })
}
