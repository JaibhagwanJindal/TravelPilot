import { describe, it, expect } from 'vitest'

// ─── Pure utility: budget calculator logic extracted from trip-itinerary.tsx ───
function calculateBudgetSummary(
  days: Array<{ estimatedCost: number }>,
  plannedBudget: number
) {
  const estimatedSpend = days.reduce((acc, day) => acc + (day.estimatedCost || 0), 0)
  const remainingBudget = plannedBudget - estimatedSpend
  const percentageUsed = plannedBudget > 0 ? (estimatedSpend / plannedBudget) * 100 : 0
  return { estimatedSpend, remainingBudget, percentageUsed }
}

// ─── Pure utility: safe array normaliser ────────────────────────────────────────
function safeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string')
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

// ─── Pure utility: interests normaliser ────────────────────────────────────────
function normaliseInterests(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  if (typeof value === 'string') return value.trim()
  return ''
}

// ─── Budget Calculator Tests ───────────────────────────────────────────────────
describe('calculateBudgetSummary', () => {
  it('calculates estimated spend from day costs', () => {
    const days = [{ estimatedCost: 100 }, { estimatedCost: 150 }, { estimatedCost: 200 }]
    const { estimatedSpend } = calculateBudgetSummary(days, 1000)
    expect(estimatedSpend).toBe(450)
  })

  it('calculates remaining budget correctly', () => {
    const days = [{ estimatedCost: 300 }, { estimatedCost: 200 }]
    const { remainingBudget } = calculateBudgetSummary(days, 1000)
    expect(remainingBudget).toBe(500)
  })

  it('shows negative remaining when over budget', () => {
    const days = [{ estimatedCost: 600 }, { estimatedCost: 600 }]
    const { remainingBudget } = calculateBudgetSummary(days, 1000)
    expect(remainingBudget).toBe(-200)
  })

  it('handles zero planned budget without dividing by zero', () => {
    const days = [{ estimatedCost: 100 }]
    const { percentageUsed } = calculateBudgetSummary(days, 0)
    expect(percentageUsed).toBe(0)
  })

  it('handles missing estimatedCost gracefully (treats as 0)', () => {
    const days = [{ estimatedCost: undefined as unknown as number }, { estimatedCost: 200 }]
    const { estimatedSpend } = calculateBudgetSummary(days, 500)
    expect(estimatedSpend).toBe(200)
  })

  it('calculates percentage used correctly', () => {
    const days = [{ estimatedCost: 500 }]
    const { percentageUsed } = calculateBudgetSummary(days, 1000)
    expect(percentageUsed).toBe(50)
  })

  it('returns 0 spend for empty days array', () => {
    const { estimatedSpend, remainingBudget } = calculateBudgetSummary([], 1000)
    expect(estimatedSpend).toBe(0)
    expect(remainingBudget).toBe(1000)
  })
})

// ─── Array Safety Tests ────────────────────────────────────────────────────────
describe('safeArray', () => {
  it('returns the same array when given an array', () => {
    expect(safeArray(['Vegetarian', 'Family Friendly'])).toEqual(['Vegetarian', 'Family Friendly'])
  })

  it('returns empty array for undefined', () => {
    expect(safeArray(undefined)).toEqual([])
  })

  it('returns empty array for null', () => {
    expect(safeArray(null)).toEqual([])
  })

  it('wraps a non-empty string in an array', () => {
    expect(safeArray('Vegetarian')).toEqual(['Vegetarian'])
  })

  it('returns empty array for empty string', () => {
    expect(safeArray('')).toEqual([])
  })

  it('filters out non-string values from arrays', () => {
    expect(safeArray([1, 'valid', null, 'also-valid'] as any)).toEqual(['valid', 'also-valid'])
  })
})

// ─── Interests Normaliser Tests ────────────────────────────────────────────────
describe('normaliseInterests', () => {
  it('returns string unchanged when given a string', () => {
    expect(normaliseInterests('food, hiking, museums')).toBe('food, hiking, museums')
  })

  it('trims whitespace from string input', () => {
    expect(normaliseInterests('  museums  ')).toBe('museums')
  })

  it('joins an array into a comma-separated string', () => {
    expect(normaliseInterests(['food', 'hiking', 'museums'])).toBe('food, hiking, museums')
  })

  it('returns empty string for undefined', () => {
    expect(normaliseInterests(undefined)).toBe('')
  })

  it('returns empty string for null', () => {
    expect(normaliseInterests(null)).toBe('')
  })

  it('filters falsy values from array before joining', () => {
    expect(normaliseInterests(['food', '', 'museums'])).toBe('food, museums')
  })
})
