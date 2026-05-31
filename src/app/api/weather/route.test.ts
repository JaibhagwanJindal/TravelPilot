import { GET } from './route'
import { describe, it, expect } from 'vitest'

describe('Weather API', () => {
  it('returns 400 if destination is missing', async () => {
    const request = new Request('http://localhost/api/weather')
    const response = await GET(request)
    const json = await response.json()
    
    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toBe('Destination is required')
  })
})
