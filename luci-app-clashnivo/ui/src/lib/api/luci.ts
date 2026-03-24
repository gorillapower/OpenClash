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
export type ServiceActionState = 'accepted' | 'done' | 'busy' | 'error'

export interface ServiceActionResult {
  accepted: boolean
  busy?: boolean
  status: ServiceActionState
  action?: ServiceAction
  async?: boolean
  context?: string
  active_command?: string
  active_pid?: string
  started_at?: string
}

export interface ServiceStatusResult {
  running: boolean
  pid?: number
  enabled?: boolean
  service_running?: boolean
  core_running?: boolean
  watchdog_running?: boolean
  openclash_installed?: boolean
  openclash_enabled?: boolean
  openclash_service_running?: boolean
  openclash_watchdog_running?: boolean
  openclash_core_running?: boolean
  openclash_core_pid?: number
  openclash_active?: boolean
  blocked?: boolean
  blocked_reason?: string
  can_start?: boolean
  busy?: boolean
  busy_command?: string
  busy_pid?: string
  busy_started_at?: string
  core_pid?: number
  active_config?: string
  core_type?: string
  proxy_mode?: string
  run_mode?: string
}

// ---------------------------------------------------------------------------
// File types
// ---------------------------------------------------------------------------

export interface FileReadResult {
  content: string
}

// ---------------------------------------------------------------------------
// Core management types
// ---------------------------------------------------------------------------

export interface CoreVersionResult {
  version: string
  kind?: string
  core_type?: string
  source_policy?: string
  source_policy_label?: string
  selected_source?: string
  selected_source_label?: string
  source_branch?: string
  source_base?: string
  probe_url?: string
  latency_ms?: number
  accepted?: boolean
  status?: 'done' | 'error'
}

export interface CoreSourceProbeResult {
  accepted: boolean
  status: 'done' | 'error' | 'busy'
  busy?: boolean
  context?: string
  active_command?: string
  active_pid?: string
  source_policy?: string
  source_policy_label?: string
  selected_source?: string
  selected_source_label?: string
  selected_base?: string
  probe_url?: string
  latency_ms?: number
}

export type UpdateState = 'idle' | 'accepted' | 'running' | 'done' | 'nochange' | 'busy' | 'error'

export interface UpdateStatusResult {
  kind?: string
  target?: string
  accepted?: boolean
  async?: boolean
  status: UpdateState
  message?: string
  version?: string
  source_policy?: string
  source_branch?: string
  source_base?: string
  status_path?: string
  log_path?: string
  busy?: boolean
  context?: string
  active_command?: string
  active_pid?: string
  started_at?: string
}

export interface DashboardOption {
  id: string
  key: string
  name: string
  label: string
  variant: string
  installed: boolean
  selected: boolean
}

// ---------------------------------------------------------------------------
// Composition preview / validation types
// ---------------------------------------------------------------------------

export interface ConfigStageResult {
  name: string
  status: string
  message?: string
}

export interface ConfigCompositionResult {
  valid: boolean
  config_name?: string
  source_path?: string
  preview_path?: string
  preview_exists?: boolean
  report_path?: string
  failed_layer?: string
  preview_content?: string
  stages?: ConfigStageResult[]
}

// ---------------------------------------------------------------------------
// Config file types
// ---------------------------------------------------------------------------

export interface ConfigFile {
  name: string
  active: boolean
  /** File size in bytes */
  size?: number
  /** ISO timestamp of last modification */
  lastModified?: string
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

  uciAddSection(pkg: string, sectionType: string): Promise<string> {
    return rpcCall('uci.add', [pkg, sectionType])
  },

  uciCommit(pkg: string): Promise<void> {
    return rpcCall('uci.commit', [pkg])
  },

  // Service control
  serviceStart(name: string): Promise<ServiceActionResult> {
    return rpcCall('service.start', [name])
  },

  serviceStop(name: string): Promise<ServiceActionResult> {
    return rpcCall('service.stop', [name])
  },

  serviceRestart(name: string): Promise<ServiceActionResult> {
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

  subscriptionUpdate(name: string): Promise<UpdateStatusResult> {
    return rpcCall('subscription.update', [name])
  },

  subscriptionUpdateAll(): Promise<UpdateStatusResult> {
    return rpcCall('subscription.updateAll', [])
  },

  subscriptionEdit(name: string, data: SubscriptionEditData): Promise<void> {
    return rpcCall('subscription.edit', [name, data])
  },

  // Config files
  configList(): Promise<ConfigFile[]> {
    return rpcCall('config.list', [])
  },

  configSetActive(name: string): Promise<void> {
    return rpcCall('config.setActive', [name])
  },

  configDelete(name: string): Promise<void> {
    return rpcCall('config.delete', [name])
  },

  configRead(name: string): Promise<FileReadResult> {
    return rpcCall('config.read', [name])
  },

  configWrite(name: string, content: string): Promise<void> {
    return rpcCall('config.write', [name, content])
  },

  configPreview(): Promise<ConfigCompositionResult> {
    return rpcCall('config.preview', [])
  },

  configValidate(): Promise<ConfigCompositionResult> {
    return rpcCall('config.validate', [])
  },

  // Core management
  coreLatestVersion(): Promise<CoreVersionResult> {
    return rpcCall('core.latestVersion', [])
  },

  coreRefreshLatestVersion(): Promise<CoreVersionResult> {
    return rpcCall('core.refreshLatestVersion', [])
  },

  coreProbeSources(): Promise<CoreSourceProbeResult> {
    return rpcCall('core.probeSources', [])
  },

  coreUpdate(): Promise<UpdateStatusResult> {
    return rpcCall('core.update', [])
  },

  coreUpdateStatus(): Promise<UpdateStatusResult> {
    return rpcCall('core.updateStatus', [])
  },

  packageLatestVersion(): Promise<CoreVersionResult> {
    return rpcCall('package.latestVersion', [])
  },

  packageRefreshLatestVersion(): Promise<CoreVersionResult> {
    return rpcCall('package.refreshLatestVersion', [])
  },

  packageUpdate(): Promise<UpdateStatusResult> {
    return rpcCall('package.update', [])
  },

  packageUpdateStatus(): Promise<UpdateStatusResult> {
    return rpcCall('package.updateStatus', [])
  },

  assetsUpdate(target = 'all'): Promise<UpdateStatusResult> {
    return rpcCall('assets.update', [target])
  },

  assetsUpdateStatus(target = 'all'): Promise<UpdateStatusResult> {
    return rpcCall('assets.updateStatus', [target])
  },

  dashboardList(): Promise<DashboardOption[]> {
    return rpcCall('dashboard.list', [])
  },

  dashboardSelect(id: string): Promise<void> {
    return rpcCall('dashboard.select', [id])
  },

  dashboardUpdate(id: string): Promise<UpdateStatusResult> {
    return rpcCall('dashboard.update', [id])
  },

  dashboardUpdateStatus(id: string): Promise<UpdateStatusResult> {
    return rpcCall('dashboard.updateStatus', [id])
  },

  // Logs
  logService(lines?: number): Promise<string> {
    return rpcCall<string>('log.service', lines !== undefined ? [lines] : [])
  },

  logCore(lines?: number): Promise<string> {
    return rpcCall<string>('log.core', lines !== undefined ? [lines] : [])
  }
}
