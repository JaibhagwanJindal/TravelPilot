import { describe, it, expect } from 'vitest'
import { tripFormSchema } from '@/types/trip'

// Minimal valid base values to build on
const today = new Date()
const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

const validBase = {
  destination: 'Tokyo, Japan',
  dateRange: { from: today, to: nextWeek },
  budget: 'Moderate' as const,
  plannedBudget: 1500,
  travelers: 2,
  travelStyle: 'Cultural' as const,
  interests: 'museums, sushi, temples',
  transportation: 'Public Transit' as const,
  constraints: [],
}

describe('tripFormSchema - destination', () => {
  it('accepts a valid destination', () => {
    const result = tripFormSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('rejects destination shorter than 2 chars', () => {
    const result = tripFormSchema.safeParse({ ...validBase, destination: 'T' })
    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.destination).toBeDefined()
  })

  it('rejects empty destination', () => {
    const result = tripFormSchema.safeParse({ ...validBase, destination: '' })
    expect(result.success).toBe(false)
  })
})

describe('tripFormSchema - budget', () => {
  it('accepts valid budget tiers', () => {
    for (const tier of ['Budget', 'Moderate', 'Luxury'] as const) {
      const result = tripFormSchema.safeParse({ ...validBase, budget: tier })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid budget tier', () => {
    const result = tripFormSchema.safeParse({ ...validBase, budget: 'Ultra' as any })
    expect(result.success).toBe(false)
  })
})

describe('tripFormSchema - travelers', () => {
  it('accepts at least 1 traveler', () => {
    const result = tripFormSchema.safeParse({ ...validBase, travelers: 1 })
    expect(result.success).toBe(true)
  })

  it('rejects 0 travelers', () => {
    const result = tripFormSchema.safeParse({ ...validBase, travelers: 0 })
    expect(result.success).toBe(false)
  })
})

describe('tripFormSchema - plannedBudget', () => {
  it('accepts budget >= 10', () => {
    const result = tripFormSchema.safeParse({ ...validBase, plannedBudget: 10 })
    expect(result.success).toBe(true)
  })

  it('rejects budget < 10', () => {
    const result = tripFormSchema.safeParse({ ...validBase, plannedBudget: 5 })
    expect(result.success).toBe(false)
  })
})

describe('tripFormSchema - interests', () => {
  it('accepts a valid interests string', () => {
    const result = tripFormSchema.safeParse({ ...validBase, interests: 'food, hiking' })
    expect(result.success).toBe(true)
  })

  it('rejects interests shorter than 3 characters', () => {
    const result = tripFormSchema.safeParse({ ...validBase, interests: 'ab' })
    expect(result.success).toBe(false)
  })
})

describe('tripFormSchema - travelStyle', () => {
  it('accepts all valid travel styles', () => {
    for (const style of ['Relaxed', 'Adventure', 'Cultural', 'Nightlife', 'Nature'] as const) {
      const result = tripFormSchema.safeParse({ ...validBase, travelStyle: style })
      expect(result.success).toBe(true)
    }
  })

  it('rejects unknown travel style', () => {
    const result = tripFormSchema.safeParse({ ...validBase, travelStyle: 'Party' as any })
    expect(result.success).toBe(false)
  })
})

describe('tripFormSchema - constraints', () => {
  it('accepts empty constraints array', () => {
    const result = tripFormSchema.safeParse({ ...validBase, constraints: [] })
    expect(result.success).toBe(true)
  })

  it('accepts multiple valid constraints', () => {
    const result = tripFormSchema.safeParse({
      ...validBase,
      constraints: ['Vegetarian', 'Family Friendly'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts undefined constraints (optional)', () => {
    const { constraints: _, ...withoutConstraints } = validBase
    const result = tripFormSchema.safeParse(withoutConstraints)
    expect(result.success).toBe(true)
  })
})
