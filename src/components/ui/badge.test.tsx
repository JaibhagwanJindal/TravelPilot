import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge component', () => {
  it('renders children text correctly', () => {
    render(<Badge>Upcoming</Badge>)
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
  })

  it('renders with default variant classes', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('bg-primary')
  })

  it('renders with secondary variant', () => {
    render(<Badge variant="secondary">Past</Badge>)
    expect(screen.getByText('Past')).toHaveClass('bg-secondary')
  })

  it('renders with outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>)
    expect(screen.getByText('Outline')).toHaveClass('text-foreground')
  })

  it('renders with destructive variant', () => {
    render(<Badge variant="destructive">Error</Badge>)
    expect(screen.getByText('Error')).toHaveClass('bg-destructive')
  })

  it('applies additional className prop', () => {
    render(<Badge className="custom-class">Custom</Badge>)
    expect(screen.getByText('Custom')).toHaveClass('custom-class')
  })

  it('renders as a span element', () => {
    const { container } = render(<Badge>Tag</Badge>)
    expect(container.querySelector('span')).toBeInTheDocument()
  })
})
