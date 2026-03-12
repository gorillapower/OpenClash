import { ApiError, normaliseError } from './errors'
import { authStore, getToken } from '$lib/stores/auth'

// ---------------------------------------------------------------------------
// JSON-RPC types
// ---------------------------------------------------------------------------

interface RpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params: unknown[]
}

interface RpcResponse<T = unknown> {
  jsonrpc: '2.0'
  id: number
  result?: T
  error?: { code: number; message: string }
}

// ---------------------------------------------------------------------------
// UCI types
// ---------------------------------------------------------------------------

export type UciValue = string | string[]
export type UciSection = Record<string, UciValue>
export type UciPackage = Record<string, UciSection>

// ---------------------------------------------------------------------------
// Service types
// ---------------------------------------------------------------------------

export type ServiceAction = 'start' | 'stop' | 'restart'

export interface ServiceStatusResult {
  running: boolean
  pid?: number
}

// ---------------------------------------------------------------------------
// File types
// ---------------------------------------------------------------------------

export interface FileReadResult {
  content: string
}

// ---------------------------------------------------------------------------
// Subscription types
// ---------------------------------------------------------------------------

export interface Subscription {
  name: string
  url: string
  /** Auto-update interval in hours; 0 means disabled */
  autoUpdateInterval?: number
  /** ISO timestamp of last successful update */
  lastUpdated?: string
  /** ISO timestamp of subscription expiry (from subscription user-info) */
  expiry?: string
  /** Bytes used (upload + download combined) */
  dataUsed?: number
  /** Total data allowance in bytes */
  dataTotal?: number
}

export interface SubscriptionEditData {
  url?: string
  newName?: string
  autoUpdateInterval?: number
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const RPC_ENDPOINT = '/cgi-bin/luci/rpc/clash-nivo'

let _requestId = 1
function nextId(): number {
  return _requestId++
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const token = getToken()

  const body: RpcRequest = {
    jsonrpc: '2.0',
    id: nextId(),
    method,
    // LuCI RPC expects the auth token as the first element of params
    params: token ? [token, ...params] : params
  }

  let res: Response
  try {
    res = await fetch(RPC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (err) {
    throw await normaliseError(err)
  }

  if (res.status === 401) {
    authStore.clearToken()
    throw new ApiError(401, 'Session expired — please log in again')
  }

  if (!res.ok) {
    throw await normaliseError(res)
  }

  let json: RpcResponse<T>
  try {
    json = (await res.json()) as RpcResponse<T>
  } catch {
    throw new ApiError(0, 'Invalid JSON response from LuCI RPC')
  }

  if (json.error) {
    throw new ApiError(json.error.code ?? 500, json.error.message)
  }

  return json.result as T
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const luciRpc = {
  // UCI
  uciGet(pkg: string, section?: string, option?: string): Promise<UciPackage | UciSection | UciValue> {
    const params: string[] = [pkg]
    if (section) params.push(section)
    if (option) params.push(option)
    return rpcCall('uci.get', params)
  },

  uciSet(pkg: string, section: string, option: string, value: UciValue): Promise<void> {
    return rpcCall('uci.set', [pkg, section, option, value])
  },

  uciDelete(pkg: string, section: string, option?: string): Promise<void> {
    const params: string[] = [pkg, section]
    if (option) params.push(option)
    return rpcCall('uci.delete', params)
  },

  uciCommit(pkg: string): Promise<void> {
    return rpcCall('uci.commit', [pkg])
  },

  // Service control
  serviceStart(name: string): Promise<void> {
    return rpcCall('service.start', [name])
  },

  serviceStop(name: string): Promise<void> {
    return rpcCall('service.stop', [name])
  },

  serviceRestart(name: string): Promise<void> {
    return rpcCall('service.restart', [name])
  },

  serviceStatus(name: string): Promise<ServiceStatusResult> {
    return rpcCall('service.status', [name])
  },

  // File ops
  fileRead(path: string): Promise<FileReadResult> {
    return rpcCall('file.read', [path])
  },

  fileWrite(path: string, content: string): Promise<void> {
    return rpcCall('file.write', [path, content])
  },

  subscriptionAdd(url: string, name?: string): Promise<{ name: string }> {
    const params: string[] = [url]
    if (name) params.push(name)
    return rpcCall('subscription.add', params)
  },

  subscriptionList(): Promise<Subscription[]> {
    return rpcCall('subscription.list', [])
  },

  subscriptionDelete(name: string): Promise<void> {
    return rpcCall('subscription.delete', [name])
  },

  subscriptionUpdate(name: string): Promise<void> {
    return rpcCall('subscription.update', [name])
  },

  subscriptionUpdateAll(): Promise<void> {
    return rpcCall('subscription.updateAll', [])
  },

  subscriptionEdit(name: string, data: SubscriptionEditData): Promise<void> {
    return rpcCall('subscription.edit', [name, data])
  }
}
