import { assertOk, normaliseError } from './errors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClashVersion {
  version: string
  meta: boolean
}

export interface ClashConfig {
  port: number
  'socks-port': number
  'redir-port': number
  'tproxy-port': number
  mode: 'rule' | 'global' | 'direct'
  'log-level': string
  ipv6: boolean
  'allow-lan': boolean
  'external-controller': string
}

export interface ProxyInfo {
  name: string
  type: string
  udp: boolean
  history: Array<{ time: string; delay: number }>
  alive?: boolean
}

export interface ProxyGroup extends ProxyInfo {
  all: string[]
  now: string
}

export interface ProxiesResponse {
  proxies: Record<string, ProxyInfo | ProxyGroup>
}

export interface Connection {
  id: string
  metadata: {
    network: string
    type: string
    sourceIP: string
    destinationIP: string
    sourcePort: string
    destinationPort: string
    host: string
    dnsMode: string
    processPath: string
  }
  upload: number
  download: number
  start: string
  chains: string[]
  rule: string
  rulePayload: string
}

export interface ConnectionsResponse {
  downloadTotal: number
  uploadTotal: number
  connections: Connection[] | null
}

export interface TrafficSnapshot {
  up: number
  down: number
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface ClashClientOptions {
  /** Base URL for the Clash REST API, e.g. http://192.168.1.1:9090 */
  baseUrl?: string
  /** Optional Bearer secret configured in clash YAML */
  secret?: string
}

function resolveBaseUrl(): string {
  const env = (import.meta as unknown as { env: Record<string, string> | undefined }).env
  // VITE_CLASH_URL overrides everything (set to /clash-api in dev to use Vite proxy)
  if (env?.VITE_CLASH_URL) return env.VITE_CLASH_URL
  // Production: derive from current hostname (app is served from the router)
  return typeof window !== 'undefined'
    ? `http://${window.location.hostname}:9090`
    : 'http://192.168.1.1:9090'
}

export function createClashClient(opts: ClashClientOptions = {}) {
  const baseUrl = (opts.baseUrl ?? resolveBaseUrl()).replace(/\/$/, '')
  const secret = opts.secret

  function headers(): HeadersInit {
    return secret ? { Authorization: `Bearer ${secret}` } : {}
  }

  async function get<T>(path: string): Promise<T> {
    try {
      const res = await fetch(`${baseUrl}${path}`, { headers: headers() })
      await assertOk(res)
      return res.json() as Promise<T>
    } catch (err) {
      throw await normaliseError(err)
    }
  }

  async function patch<T>(path: string, body: unknown): Promise<T> {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'PATCH',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      await assertOk(res)
      return res.json() as Promise<T>
    } catch (err) {
      throw await normaliseError(err)
    }
  }

  async function del(path: string): Promise<void> {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'DELETE',
        headers: headers()
      })
      await assertOk(res)
    } catch (err) {
      throw await normaliseError(err)
    }
  }

  async function post(path: string): Promise<void> {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: headers()
      })
      await assertOk(res)
    } catch (err) {
      throw await normaliseError(err)
    }
  }

  return {
    getVersion: () => get<ClashVersion>('/version'),
    getConfig: () => get<ClashConfig>('/configs'),
    patchConfig: (config: Partial<ClashConfig>) => patch<ClashConfig>('/configs', config),
    getProxies: () => get<ProxiesResponse>('/proxies'),
    getConnections: () => get<ConnectionsResponse>('/connections'),
    closeConnections: () => del('/connections'),

    /** One-shot traffic snapshot (polls manually — use getTrafficStream for live data). */
    getTraffic: () => get<TrafficSnapshot>('/traffic'),

    /** Flushes both the fake-IP and DNS caches in Clash. */
    flushDnsCache: async () => {
      await post('/cache/fakeip/flush')
      await post('/cache/dns/flush')
    },

    /** Returns base URL for constructing WebSocket/SSE URLs externally. */
    getBaseUrl: () => baseUrl
  }
}

export type ClashClient = ReturnType<typeof createClashClient>

/** Default singleton client, reads config from env. */
export const clashClient = createClashClient()
