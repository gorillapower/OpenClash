import {
  createQuery,
  type CreateQueryOptions,
  type QueryClient
} from '@tanstack/svelte-query'
import { clashClient, type ClashVersion, type ClashConfig, type ProxiesResponse, type ConnectionsResponse } from '$lib/api/clash'

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
// Queries
// v6 requires a getter function: createQuery(() => ({ ... }))
// ---------------------------------------------------------------------------

export function useClashVersion(opts?: Partial<CreateQueryOptions<ClashVersion>>) {
  return createQuery<ClashVersion>(() => ({
    queryKey: clashKeys.version(),
    queryFn: () => clashClient.getVersion(),
    ...opts
  } as CreateQueryOptions<ClashVersion>))
}

export function useClashConfig(opts?: Partial<CreateQueryOptions<ClashConfig>>) {
  return createQuery<ClashConfig>(() => ({
    queryKey: clashKeys.config(),
    queryFn: () => clashClient.getConfig(),
    ...opts
  } as CreateQueryOptions<ClashConfig>))
}

export function useProxies(opts?: Partial<CreateQueryOptions<ProxiesResponse>>) {
  return createQuery<ProxiesResponse>(() => ({
    queryKey: clashKeys.proxies(),
    queryFn: () => clashClient.getProxies(),
    ...opts
  } as CreateQueryOptions<ProxiesResponse>))
}

export function useConnections(opts?: Partial<CreateQueryOptions<ConnectionsResponse>>) {
  return createQuery<ConnectionsResponse>(() => ({
    queryKey: clashKeys.connections(),
    queryFn: () => clashClient.getConnections(),
    ...opts
  } as CreateQueryOptions<ConnectionsResponse>))
}

/**
 * Polls Clash running status every 5 seconds.
 * "Status" is derived from /version — if it resolves, Clash is running.
 * Polling failures are silent — they just mean Clash isn't reachable.
 */
export function useClashStatus(opts?: Partial<CreateQueryOptions<ClashVersion>>) {
  return createQuery<ClashVersion>(() => ({
    queryKey: clashKeys.status(),
    queryFn: () => clashClient.getVersion(),
    refetchInterval: 5000,
    retry: false,
    ...opts
  } as CreateQueryOptions<ClashVersion>))
}

export function invalidateClash(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: clashKeys.all })
}
