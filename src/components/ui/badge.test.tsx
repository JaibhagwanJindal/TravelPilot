import { render, screen } from '@testing-library/react'
import { Badge } from './badge'
import { describe, it, expect } from 'vitest'

describe('Badge', () => {
  it('renders correctly with default variant', () => {
    render(<Badge>Test Badge</Badge>)
    const badge = screen.getByText('Test Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-primary')
  })

  it('renders correctly with outline variant', () => {
    render(<Badge variant="outline">Outline Badge</Badge>)
    const badge = screen.getByText('Outline Badge')
    expect(badge).toHaveClass('text-foreground')
  })
})
