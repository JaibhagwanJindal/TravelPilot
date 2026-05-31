import { describe, it, expect, vi } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

const makeWeatherRequest = (destination?: string) => {
  const url = destination
    ? `http://localhost/api/weather?destination=${encodeURIComponent(destination)}`
    : 'http://localhost/api/weather'
  return new Request(url)
}

describe('GET /api/weather', () => {
  it('returns 400 when destination query param is missing', async () => {
    const { GET } = await import('./route')
    const res = await GET(makeWeatherRequest())
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toBe('Destination is required')
  })

  it('returns fallback mock data when OPENWEATHER_API_KEY is missing', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', '')
    const { GET } = await import('./route')
    const res = await GET(makeWeatherRequest('Tokyo'))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty('temp')
    expect(json.data).toHaveProperty('condition')
    expect(json.data).toHaveProperty('isRaining')
    expect(Array.isArray(json.data.alerts)).toBe(true)
  })

  it('returns isRaining false for Clear condition in fallback', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', '')
    const { GET } = await import('./route')
    const res = await GET(makeWeatherRequest('Paris'))
    const json = await res.json()
    expect(json.data.isRaining).toBe(false)
    expect(json.data.condition).toBe('Clear')
  })

  it('returns correct shape for valid destination with missing API key', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', '')
    const { GET } = await import('./route')
    const res = await GET(makeWeatherRequest('London'))
    const json = await res.json()
    const data = json.data
    expect(typeof data.temp).toBe('number')
    expect(typeof data.condition).toBe('string')
    expect(typeof data.description).toBe('string')
    expect(typeof data.isRaining).toBe('boolean')
  })

  it('returns 400 for empty string destination param', async () => {
    const { GET } = await import('./route')
    // destination= with no value behaves as empty string, handled as falsy
    const req = new Request('http://localhost/api/weather?destination=')
    const res = await GET(req)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })
})
