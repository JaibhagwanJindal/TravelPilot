import { describe, it, expect, vi } from 'vitest'

// ─── Mock next/server ─────────────────────────────────────────────────────────
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              itinerary: {
                tripName: 'Test Trip',
                days: [
                  {
                    day: 1,
                    title: 'Day 1',
                    activities: [],
                    foodRecommendations: [],
                    estimatedCost: 100,
                  },
                ],
              },
            },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn(async () => ({
        response: {
          text: () =>
            JSON.stringify({
              day: 1,
              title: 'Replanned Day 1 - Indoor Activities',
              activities: [
                {
                  title: 'Museum Visit',
                  description: 'Great indoor option for rainy days.',
                  location: 'Tokyo National Museum',
                  lat: 35.71,
                  lng: 139.77,
                  estimatedCost: 20,
                  estimatedTransitTime: '10 min walk',
                },
              ],
              foodRecommendations: ['Ramen', 'Udon'],
              estimatedCost: 80,
            }),
        },
      })),
    })),
  })),
}))

const makeReplanRequest = (body: object) =>
  new Request('http://localhost/api/trips/replan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const validReplanBody = {
  day: 1,
  currentItinerary: {
    day: 1,
    title: 'Day 1 - Sightseeing',
    activities: [{ title: 'Outdoor Park', location: 'Shinjuku Gyoen', description: 'Nice park.' }],
    foodRecommendations: ['Sushi'],
    estimatedCost: 100,
  },
  destination: 'Tokyo',
  weather: {
    temp: 18,
    condition: 'Rain',
    description: 'heavy rain',
    isRaining: true,
    alerts: [],
  },
  plannedBudget: 1500,
  constraints: ['Vegetarian'],
  tripId: null,
}

describe('POST /api/trips/replan', () => {
  it('returns replanned day with correct shape', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    const { POST } = await import('./route')
    const res = await POST(makeReplanRequest(validReplanBody))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty('day')
    expect(json.data).toHaveProperty('title')
    expect(json.data).toHaveProperty('activities')
    expect(Array.isArray(json.data.activities)).toBe(true)
  })

  it('handles constraints as empty array without crashing', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    const { POST } = await import('./route')
    const res = await POST(makeReplanRequest({ ...validReplanBody, constraints: [] }))
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('handles missing constraints gracefully', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    const { POST } = await import('./route')
    const { constraints: _, ...noConstraints } = validReplanBody
    const res = await POST(makeReplanRequest(noConstraints))
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('replanned activities include indoor options for rainy weather', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    const { POST } = await import('./route')
    const res = await POST(makeReplanRequest(validReplanBody))
    const json = await res.json()
    expect(json.data.activities[0].title).toBe('Museum Visit')
  })
})
