import { describe, it, expect } from 'vitest'

// ─── Weather data shape validator (mirrors what the weather route returns) ─────
interface WeatherData {
  temp: number
  condition: string
  description: string
  isRaining: boolean
  alerts: string[]
  icon?: string
}

function isRainingCondition(condition: string): boolean {
  return ['Rain', 'Drizzle', 'Thunderstorm'].includes(condition)
}

function buildAlerts(windSpeed: number, temp: number): string[] {
  const alerts: string[] = []
  if (windSpeed > 20) alerts.push('High wind warning')
  if (temp > 35) alerts.push('Extreme heat warning')
  return alerts
}

function normaliseWeatherResponse(data: any): WeatherData {
  const condition = data.weather?.[0]?.main || 'Unknown'
  const description = data.weather?.[0]?.description || ''
  return {
    temp: Math.round(data.main?.temp ?? 0),
    condition,
    description,
    isRaining: isRainingCondition(condition),
    alerts: buildAlerts(data.wind?.speed ?? 0, data.main?.temp ?? 0),
    icon: data.weather?.[0]?.icon,
  }
}

describe('isRainingCondition', () => {
  it('returns true for Rain', () => {
    expect(isRainingCondition('Rain')).toBe(true)
  })

  it('returns true for Drizzle', () => {
    expect(isRainingCondition('Drizzle')).toBe(true)
  })

  it('returns true for Thunderstorm', () => {
    expect(isRainingCondition('Thunderstorm')).toBe(true)
  })

  it('returns false for Clear', () => {
    expect(isRainingCondition('Clear')).toBe(false)
  })

  it('returns false for Clouds', () => {
    expect(isRainingCondition('Clouds')).toBe(false)
  })

  it('returns false for Snow', () => {
    expect(isRainingCondition('Snow')).toBe(false)
  })
})

describe('buildAlerts', () => {
  it('generates high wind warning when wind speed > 20', () => {
    const alerts = buildAlerts(25, 20)
    expect(alerts).toContain('High wind warning')
  })

  it('generates extreme heat warning when temp > 35', () => {
    const alerts = buildAlerts(5, 40)
    expect(alerts).toContain('Extreme heat warning')
  })

  it('generates both alerts when both conditions are met', () => {
    const alerts = buildAlerts(30, 40)
    expect(alerts).toHaveLength(2)
  })

  it('generates no alerts under normal conditions', () => {
    const alerts = buildAlerts(10, 25)
    expect(alerts).toHaveLength(0)
  })

  it('generates no alert at exact wind threshold (20 is not > 20)', () => {
    const alerts = buildAlerts(20, 20)
    expect(alerts).toHaveLength(0)
  })
})

describe('normaliseWeatherResponse', () => {
  const mockOWMResponse = {
    main: { temp: 22.6 },
    weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
    wind: { speed: 5 },
  }

  it('rounds temperature correctly', () => {
    const result = normaliseWeatherResponse(mockOWMResponse)
    expect(result.temp).toBe(23)
  })

  it('sets isRaining to false for Clear', () => {
    const result = normaliseWeatherResponse(mockOWMResponse)
    expect(result.isRaining).toBe(false)
  })

  it('sets isRaining to true for Rain', () => {
    const rainy = { ...mockOWMResponse, weather: [{ main: 'Rain', description: 'heavy rain', icon: '09d' }] }
    const result = normaliseWeatherResponse(rainy)
    expect(result.isRaining).toBe(true)
  })

  it('handles missing weather array gracefully', () => {
    const result = normaliseWeatherResponse({ main: { temp: 20 }, wind: { speed: 3 } })
    expect(result.condition).toBe('Unknown')
    expect(result.description).toBe('')
  })

  it('returns empty alerts array for normal conditions', () => {
    const result = normaliseWeatherResponse(mockOWMResponse)
    expect(result.alerts).toEqual([])
  })
})
