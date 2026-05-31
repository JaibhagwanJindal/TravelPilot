import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/server before importing the route
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

// Mock @supabase/ssr and next/headers so the server client doesn't crash in test
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'mock-uuid' }, error: null })),
        })),
      })),
    })),
  })),
}))

// Mock Gemini
vi.mock('@google/generative-ai', () => {
  const mockItinerary = {
    tripName: 'Tokyo Adventure',
    destination: 'Tokyo',
    summary: 'A wonderful trip to Tokyo.',
    estimatedBudget: { total: 1500, currency: 'USD' },
    days: [
      {
        day: 1,
        title: 'Day 1 - Arrival',
        activities: [
          {
            title: 'Senso-ji Temple',
            description: 'Visit the famous temple.',
            location: 'Asakusa',
            lat: 35.71,
            lng: 139.79,
            estimatedCost: 0,
            estimatedTransitTime: '20 min walk',
          },
        ],
        foodRecommendations: ['Ramen', 'Sushi'],
        estimatedCost: 100,
      },
    ],
    travelTips: ['Get a Suica card', 'Learn basic Japanese phrases'],
  }

  return {
    GoogleGenerativeAI: vi.fn(() => ({
      getGenerativeModel: vi.fn(() => ({
        generateContent: vi.fn(async () => ({
          response: {
            text: () => JSON.stringify(mockItinerary),
          },
        })),
      })),
    })),
  }
})

const makeRequest = (body: object) =>
  new Request('http://localhost/api/trips/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify(body),
  })

const validBody = {
  destination: 'Tokyo',
  dateRange: {
    from: new Date('2025-09-01').toISOString(),
    to: new Date('2025-09-07').toISOString(),
  },
  budget: 'Moderate',
  plannedBudget: 1500,
  travelers: 2,
  travelStyle: 'Cultural',
  interests: 'temples, ramen, anime',
  transportation: 'Public Transit',
  constraints: ['Vegetarian'],
}

describe('POST /api/trips/create', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
  })

  it('returns 400 for invalid JSON body', async () => {
    const { POST } = await import('../create/route')
    const req = new Request('http://localhost/api/trips/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 400 when destination is missing', async () => {
    const { POST } = await import('../create/route')
    const { destination: _, ...noDestination } = validBody
    const res = await POST(makeRequest(noDestination))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 400 when budget tier is invalid', async () => {
    const { POST } = await import('../create/route')
    const res = await POST(makeRequest({ ...validBody, budget: 'Ultra' }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('handles interests as a plain string (does not crash)', async () => {
    const { POST } = await import('../create/route')
    // Exact scenario that caused the s.join crash
    const res = await POST(makeRequest({ ...validBody, interests: 'food, temples, hiking' }))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.tripName).toBe('Tokyo Adventure')
  })

  it('handles constraints as undefined gracefully', async () => {
    const { POST } = await import('../create/route')
    const { constraints: _, ...noConstraints } = validBody
    const res = await POST(makeRequest(noConstraints))
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('handles constraints as an empty array', async () => {
    const { POST } = await import('../create/route')
    const res = await POST(makeRequest({ ...validBody, constraints: [] }))
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns structured itinerary with required fields', async () => {
    const { POST } = await import('../create/route')
    const res = await POST(makeRequest(validBody))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty('tripName')
    expect(json.data).toHaveProperty('destination')
    expect(json.data).toHaveProperty('days')
    expect(json.data).toHaveProperty('travelTips')
    expect(Array.isArray(json.data.days)).toBe(true)
    expect(Array.isArray(json.data.travelTips)).toBe(true)
  })

  it('attaches plannedBudget and constraints to the response', async () => {
    const { POST } = await import('../create/route')
    const res = await POST(makeRequest(validBody))
    const json = await res.json()
    expect(json.data.plannedBudget).toBe(1500)
    expect(Array.isArray(json.data.constraints)).toBe(true)
  })
})
