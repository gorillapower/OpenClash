import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { luciRpc } from '$lib/api/luci'
import { ApiError } from '$lib/api/errors'
import { authStore } from '$lib/stores/auth'

function mockFetchRpc(result: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ jsonrpc: '2.0', id: 1, result }),
      { status, headers: { 'Content-Type': 'application/json' } }
    )
  )
}

function mockFetchRpcError(code: number, message: string) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code, message } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  )
}

function mockFetchNetworkError() {
  return vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
}

beforeEach(() => {
  vi.restoreAllMocks()
  authStore.clearToken()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('luciRpc.uciGet', () => {
  it('returns parsed UCI package', async () => {
    const pkg = { openclash: { config: { opmode: 'fake-ip' } } }
    mockFetchRpc(pkg)
    const result = await luciRpc.uciGet('openclash')
    expect(result).toEqual(pkg)
  })

  it('includes auth token as first RPC param when token is set', async () => {
    authStore.setToken('test-session-token')
    const spy = mockFetchRpc({})

    await luciRpc.uciGet('openclash')

    const body = JSON.parse(spy.mock.calls[0][1]?.body as string)
    expect(body.params[0]).toBe('test-session-token')
  })

  it('does not include auth token when none set', async () => {
    const spy = mockFetchRpc({})

    await luciRpc.uciGet('openclash')

    const body = JSON.parse(spy.mock.calls[0][1]?.body as string)
    // first param should be the package name, not a token
    expect(body.params[0]).toBe('openclash')
  })
})

describe('luciRpc.serviceStart', () => {
  it('resolves on success', async () => {
    mockFetchRpc(null)
    await expect(luciRpc.serviceStart('openclash')).resolves.toBeFalsy()
  })
})

describe('luciRpc.fileRead', () => {
  it('returns file content', async () => {
    mockFetchRpc({ content: 'proxies:\n  - name: test\n' })
    const result = await luciRpc.fileRead('/etc/openclash/config.yaml')
    expect(result.content).toContain('proxies')
  })
})

describe('auth token handling', () => {
  it('clears auth store on 401 response', async () => {
    authStore.setToken('expired-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 })
    )

    await expect(luciRpc.uciGet('openclash')).rejects.toSatisfy(
      (e: unknown) => e instanceof ApiError && e.status === 401
    )

    let currentToken: string | null = 'not-checked'
    authStore.subscribe((t) => { currentToken = t })()
    expect(currentToken).toBeNull()
  })
})

describe('RPC error handling', () => {
  it('throws ApiError when response contains JSON-RPC error field', async () => {
    mockFetchRpcError(-32601, 'Method not found')

    await expect(luciRpc.uciGet('openclash')).rejects.toSatisfy(
      (e: unknown) => e instanceof ApiError && e.message === 'Method not found'
    )
  })

  it('throws ApiError with status 500 on HTTP 500', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 500 })
    )

    await expect(luciRpc.uciGet('openclash')).rejects.toSatisfy(
      (e: unknown) => e instanceof ApiError && e.status === 500
    )
  })

  it('throws ApiError with status 0 on network failure', async () => {
    mockFetchNetworkError()

    await expect(luciRpc.uciGet('openclash')).rejects.toSatisfy(
      (e: unknown) => e instanceof ApiError && e.status === 0
    )
  })
})
