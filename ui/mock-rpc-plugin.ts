/**
 * Mock RPC + Clash API handler for local development without a router.
 *
 * Intercepts:
 *   POST /cgi-bin/luci/rpc/clash-nivo  — LuCI JSON-RPC
 *   GET  /mock-clash/*                 — Clash REST API (set VITE_CLASH_URL=http://localhost:5173/mock-clash)
 *
 * Usage:
 *   npm run dev:mock              # running state (Clash with config)
 *   npm run dev:mock:empty        # first-time empty state
 *   npm run dev:mock:stopped      # config exists but Clash stopped
 */

import type { Plugin, Connect } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

// ---------------------------------------------------------------------------
// Mock state — set via MOCK_STATE env var
// ---------------------------------------------------------------------------

type MockState = 'running' | 'stopped' | 'empty'
const MOCK_STATE: MockState = (process.env.MOCK_STATE as MockState) ?? 'running'

// ---------------------------------------------------------------------------
// LuCI RPC mock responses
// ---------------------------------------------------------------------------

type RpcHandler = (params: unknown[]) => unknown

const RPC_HANDLERS: Record<string, RpcHandler> = {
  'uci.get': () => {
    if (MOCK_STATE === 'empty') {
      return { config: {} }
    }
    return {
      config: {
        config_path: '/etc/openclash/config/my-subscription.yaml',
        operation_mode: 'fake-ip',
        core_path: '/etc/openclash/core/clash_meta'
      }
    }
  },
  'uci.set':    () => true,
  'uci.commit': () => true,
  'service.status': () => ({
    running: MOCK_STATE === 'running',
    pid: MOCK_STATE === 'running' ? 1234 : undefined
  }),
  'service.start':   () => true,
  'service.stop':    () => true,
  'service.restart': () => true,
  'subscription.add': (params) => {
    console.log('[mock] subscription.add called with:', params)
    return { name: 'my-subscription' }
  },
  'subscription.list': () => {
    if (MOCK_STATE === 'empty') return []
    const now = Date.now()
    return [
      {
        name: 'My VPN',
        url: 'https://example.com/sub/token123',
        autoUpdateInterval: 24,
        lastUpdated: new Date(now - 2 * 3_600_000).toISOString(),
        expiry: new Date(now + 28 * 24 * 3_600_000).toISOString(),
        dataUsed:  12 * 1024 * 1024 * 1024,
        dataTotal: 100 * 1024 * 1024 * 1024
      },
      {
        name: 'Work Proxy',
        url: 'https://corp.example.com/sub/abc',
        autoUpdateInterval: 6,
        lastUpdated: new Date(now - 86_400_000).toISOString(),
        expiry: new Date(now + 5 * 24 * 3_600_000).toISOString(),
        dataUsed:  95 * 1024 * 1024 * 1024,
        dataTotal: 100 * 1024 * 1024 * 1024
      },
      {
        name: 'Backup',
        url: 'https://backup.example.com/sub/xyz',
        autoUpdateInterval: 0,
        lastUpdated: new Date(now - 7 * 86_400_000).toISOString()
      }
    ]
  },
  'subscription.delete': (params) => {
    console.log('[mock] subscription.delete called with:', params)
    return true
  },
  'subscription.update': (params) => {
    console.log('[mock] subscription.update called with:', params)
    return true
  },
  'subscription.updateAll': () => {
    console.log('[mock] subscription.updateAll called')
    return true
  },
  'subscription.edit': (params) => {
    console.log('[mock] subscription.edit called with:', params)
    return true
  },
  'file.read':   () => ({ content: '' }),
  'file.write':  () => true,
  'log.service': () => '[mock] OpenClash started\n[mock] Rules loaded\n',
  'log.core':    () => '[mock] Clash core started\n[mock] Listening on :7890\n',
  'system.info': () => ({
    core_version: 'mihomo v1.18.3',
    running: MOCK_STATE === 'running'
  })
}

// ---------------------------------------------------------------------------
// Clash REST API mock responses
// ---------------------------------------------------------------------------

const CLASH_ROUTES: Record<string, () => unknown> = {
  '/version':     () => ({ version: '1.18.3', meta: true }),
  '/configs':     () => ({ mode: 'rule', port: 7890, 'socks-port': 7891, 'redir-port': 0, 'tproxy-port': 7895, 'log-level': 'info', ipv6: false, 'allow-lan': true, 'external-controller': '0.0.0.0:9090' }),
  '/connections': () => ({ downloadTotal: 1073741824, uploadTotal: 536870912, connections: [] }),
  '/proxies':     () => ({ proxies: {} })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk: Buffer) => { data += chunk.toString() })
    req.on('end', () => resolve(data))
  })
}

function jsonResponse(res: ServerResponse, body: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

// ---------------------------------------------------------------------------
// Vite plugin
// ---------------------------------------------------------------------------

export function mockRpcPlugin(): Plugin {
  return {
    name: 'mock-rpc',
    configureServer(server) {
      // ── LuCI JSON-RPC ──────────────────────────────────────────────────
      server.middlewares.use(
        '/cgi-bin/luci/rpc/clash-nivo',
        async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          if (req.method !== 'POST') return next()
          try {
            const body = await readBody(req)
            const rpc = JSON.parse(body) as { jsonrpc: string; id: number; method: string; params?: unknown[] }
            const params = Array.isArray(rpc.params) ? rpc.params.slice(1) : []
            const handler = RPC_HANDLERS[rpc.method]
            if (!handler) {
              console.warn(`[mock] Unknown RPC: ${rpc.method}`)
              jsonResponse(res, { jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: `method not found: ${rpc.method}` } })
              return
            }
            const result = handler(params)
            console.log(`[mock rpc] ${rpc.method} →`, JSON.stringify(result).slice(0, 80))
            jsonResponse(res, { jsonrpc: '2.0', id: rpc.id, result })
          } catch (err) {
            jsonResponse(res, { jsonrpc: '2.0', id: null, error: { code: -32700, message: String(err) } }, 500)
          }
        }
      )

      // ── Clash REST API ─────────────────────────────────────────────────
      server.middlewares.use(
        '/mock-clash',
        (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          const path = (req.url ?? '/').replace(/\?.*$/, '')
          const handler = CLASH_ROUTES[path]
          if (!handler) return next()
          if (MOCK_STATE !== 'running') {
            // Clash is stopped — return 503 so queries fail silently
            res.writeHead(503)
            res.end()
            return
          }
          console.log(`[mock clash] GET ${path}`)
          jsonResponse(res, handler())
        }
      )

      console.log(`\n  🎭 Mock mode active — MOCK_STATE=${MOCK_STATE}`)
      console.log(`     Change state: MOCK_STATE=empty|stopped|running npm run dev:mock\n`)
    }
  }
}

