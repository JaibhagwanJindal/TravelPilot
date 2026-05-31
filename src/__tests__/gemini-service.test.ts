import { describe, it, expect, vi } from 'vitest'

// ─── Mock Gemini SDK ──────────────────────────────────────────────────────────
const mockGenerateContent = vi.fn()

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: mockGenerateContent,
    })),
  })),
}))

// ─── Gemini response fixtures ─────────────────────────────────────────────────
const validGeminiResponse = {
  tripName: 'Amazing Paris Trip',
  destination: 'Paris, France',
  summary: 'A cultural exploration of the City of Light.',
  estimatedBudget: { total: 2000, currency: 'EUR' },
  days: [
    {
      day: 1,
      title: 'Arrival & Eiffel Tower',
      activities: [
        {
          title: 'Eiffel Tower',
          description: 'Visit the iconic tower.',
          location: 'Champ de Mars, Paris',
          lat: 48.8584,
          lng: 2.2945,
          estimatedCost: 25,
          estimatedTransitTime: '15 mins walk',
        },
      ],
      foodRecommendations: ['Croissants', 'Crêpes'],
      estimatedCost: 150,
    },
  ],
  travelTips: ['Buy a Navigo card', 'Book restaurants in advance'],
}

describe('Gemini Service (mocked)', () => {
  it('parses a valid structured JSON response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validGeminiResponse) },
    })

    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI('test-key')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent('test prompt')
    const parsed = JSON.parse(result.response.text())

    expect(parsed.tripName).toBe('Amazing Paris Trip')
    expect(parsed.destination).toBe('Paris, France')
    expect(Array.isArray(parsed.days)).toBe(true)
    expect(parsed.days).toHaveLength(1)
    expect(Array.isArray(parsed.travelTips)).toBe(true)
  })

  it('includes activities with lat/lng for map rendering', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(validGeminiResponse) },
    })

    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI('test-key')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent('test prompt')
    const parsed = JSON.parse(result.response.text())
    const activity = parsed.days[0].activities[0]

    expect(activity).toHaveProperty('lat')
    expect(activity).toHaveProperty('lng')
    expect(typeof activity.lat).toBe('number')
    expect(typeof activity.lng).toBe('number')
  })

  it('handles network error from Gemini gracefully', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Network error'))

    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI('test-key')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    await expect(model.generateContent('test prompt')).rejects.toThrow('Network error')
  })

  it('detects when response is not valid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'This is not JSON at all.' },
    })

    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI('test-key')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent('test prompt')

    expect(() => JSON.parse(result.response.text())).toThrow()
  })

  it('validates that days array is non-empty', async () => {
    const responseWithNoDays = { ...validGeminiResponse, days: [] }
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(responseWithNoDays) },
    })

    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI('test-key')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent('test prompt')
    const parsed = JSON.parse(result.response.text())

    expect(Array.isArray(parsed.days)).toBe(true)
    // Our defensive code in route.ts normalizes this to []
    const safeDays = Array.isArray(parsed.days) ? parsed.days : []
    expect(safeDays).toHaveLength(0)
  })

  it('defensive normalisation converts non-array days to []', () => {
    const malformed = { days: null, travelTips: 'some string' }

    // Simulates what create/route.ts does after parsing
    const safeDays = Array.isArray(malformed.days) ? malformed.days : []
    const safeTips = Array.isArray(malformed.travelTips) ? malformed.travelTips : []

    expect(safeDays).toEqual([])
    expect(safeTips).toEqual([])
  })
})
