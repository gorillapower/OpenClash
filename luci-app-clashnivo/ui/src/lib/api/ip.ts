import { normaliseError } from './errors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeoIpResult {
  ip: string
  city?: string
  country?: string
  country_code?: string
  region?: string
  organization?: string
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const GEO_IP_URL = 'https://api.ip.sb/geoip'

export async function fetchGeoIp(): Promise<GeoIpResult> {
  try {
    const res = await fetch(GEO_IP_URL, {
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) throw res
    return res.json() as Promise<GeoIpResult>
  } catch (err) {
    throw await normaliseError(err)
  }
}
