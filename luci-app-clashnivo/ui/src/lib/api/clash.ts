import { assertOk, normaliseError } from './errors'
import { luciRpc, type UciPackage } from './luci'

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

function parseControllerPort(config: Record<string, string> | undefined): string {
  return config?.cn_port?.trim() || '9093'
}

function parseControllerSecret(config: Record<string, string> | undefined): string | undefined {
  const secret = config?.dashboard_password?.trim()
  return secret ? secret : undefined
}

function resolveBaseUrl(): string {
  const env = (import.meta as unknown as { env: Record<string, string> | undefined }).env
  // VITE_CLASH_URL is dev-only: routes through Vite's /clash-api proxy to avoid CORS.
  // Never use it in production builds — the app is served from the router itself,
  // so it can talk directly to Clash on the configured controller port.
  if (import.meta.env.DEV && env?.VITE_CLASH_URL) return env.VITE_CLASH_URL
  // Production: derive from current hostname (app is served from the router)
  return typeof window !== 'undefined'
    ? `http://${window.location.hostname}:9093`
    : 'http://192.168.1.1:9093'
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

export async function createRuntimeClashClient() {
  const uci = (await luciRpc.uciGet('clashnivo')) as UciPackage
  const config = uci.config as Record<string, string> | undefined
  const port = parseControllerPort(config)
  const secret = parseControllerSecret(config)
  const baseUrl =
    typeof window !== 'undefined'
      ? `http://${window.location.hostname}:${port}`
      : `http://192.168.1.1:${port}`

  return createClashClient({ baseUrl, secret })
}
