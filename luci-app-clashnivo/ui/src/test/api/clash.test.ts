import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClashClient } from '$lib/api/clash'
import { ApiError } from '$lib/api/errors'

function makeClient(secret?: string) {
  return createClashClient({ baseUrl: 'http://test-router:9090', secret })
}

function mockFetch(response: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(response), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  )
}

function mockFetchError(err: Error) {
  return vi.spyOn(globalThis, 'fetch').mockRejectedValue(err)
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ClashClient.getVersion', () => {
  it('returns typed ClashVersion on success', async () => {
    mockFetch({ version: '1.18.0', meta: true })
    const client = makeClient()
    const result = await client.getVersion()
    expect(result.version).toBe('1.18.0')
    expect(result.meta).toBe(true)
  })

  it('attaches Authorization header when secret is provided', async () => {
    const spy = mockFetch({ version: '1.18.0', meta: true })
    const client = makeClient('my-secret')
    await client.getVersion()
    expect(spy).toHaveBeenCalledWith(
      'http://test-router:9090/version',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-secret' })
      })
    )
  })

  it('does NOT attach Authorization header when no secret', async () => {
    const spy = mockFetch({ version: '1.18.0', meta: true })
    const client = makeClient()
    await client.getVersion()
    const callHeaders = spy.mock.calls[0][1]?.headers as Record<string, string>
    expect(callHeaders?.Authorization).toBeUndefined()
  })

  it('throws ApiError with status 401 on 401 response', async () => {
    mockFetch({ message: 'Unauthorized' }, 401)
    const client = makeClient()
    await expect(client.getVersion()).rejects.toSatisfy(
      (e: unknown) => e instanceof ApiError && e.status === 401
    )
  })

  it('throws ApiError with status 500 on 500 response', async () => {
    mockFetch({ message: 'Internal server error' }, 500)
    const client = makeClient()
    await expect(client.getVersion()).rejects.toSatisfy(
      (e: unknown) => e instanceof ApiError && e.status === 500
    )
  })

  it('throws ApiError with status 0 on network failure', async () => {
    mockFetchError(new TypeError('Failed to fetch'))
    const client = makeClient()
    await expect(client.getVersion()).rejects.toSatisfy(
      (e: unknown) => e instanceof ApiError && e.status === 0
    )
  })
})

describe('ClashClient.getProxies', () => {
  it('returns typed ProxiesResponse', async () => {
    mockFetch({ proxies: { DIRECT: { name: 'DIRECT', type: 'Direct', udp: true, history: [] } } })
    const client = makeClient()
    const result = await client.getProxies()
    expect(result.proxies).toHaveProperty('DIRECT')
    expect(result.proxies.DIRECT.type).toBe('Direct')
  })
})

describe('ClashClient.getConnections', () => {
  it('returns typed ConnectionsResponse', async () => {
    mockFetch({ downloadTotal: 1024, uploadTotal: 512, connections: [] })
    const client = makeClient()
    const result = await client.getConnections()
    expect(result.downloadTotal).toBe(1024)
    expect(result.uploadTotal).toBe(512)
    expect(result.connections).toEqual([])
  })
})

describe('ClashClient.getTraffic', () => {
  it('returns traffic snapshot', async () => {
    mockFetch({ up: 100, down: 200 })
    const client = makeClient()
    const result = await client.getTraffic()
    expect(result.up).toBe(100)
    expect(result.down).toBe(200)
  })
})

describe('ClashClient.closeConnections', () => {
  it('sends DELETE request', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 })
    )
    const client = makeClient()
    await client.closeConnections()
    expect(spy).toHaveBeenCalledWith(
      'http://test-router:9090/connections',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
