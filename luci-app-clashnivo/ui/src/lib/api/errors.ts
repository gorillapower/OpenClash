export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

/**
 * Converts any thrown value into an ApiError.
 * - HTTP responses with non-2xx status → ApiError with that status
 * - Network failures (fetch rejects) → ApiError with status 0
 * - Already an ApiError → returned as-is
 */
export async function normaliseError(err: unknown): Promise<ApiError> {
  if (err instanceof ApiError) return err

  if (err instanceof Response) {
    let body: unknown
    try {
      body = await err.json()
    } catch {
      body = await err.text().catch(() => undefined)
    }
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as Record<string, unknown>).message)
        : `Request failed with status ${err.status}`
    return new ApiError(err.status, message, body)
  }

  if (err instanceof TypeError) {
    // fetch() network failure
    return new ApiError(0, 'Network error — check your connection')
  }

  return new ApiError(0, err instanceof Error ? err.message : 'Unknown error')
}

/** Throw an ApiError if the response is not ok. */
export async function assertOk(res: Response): Promise<Response> {
  if (res.ok) return res
  throw await normaliseError(res)
}
