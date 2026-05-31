import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button component', () => {
  it('renders children text', () => {
    render(<Button>Generate Trip</Button>)
    expect(screen.getByRole('button', { name: /generate trip/i })).toBeInTheDocument()
  })

  it('is a button element by default', () => {
    render(<Button>Click me</Button>)
    const btn = screen.getByRole('button')
    expect(btn.tagName).toBe('BUTTON')
  })

  it('renders disabled state correctly', () => {
    render(<Button disabled>Loading...</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies default variant class', () => {
    render(<Button>Default</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')
  })

  it('applies outline variant class', () => {
    render(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toHaveClass('border')
  })

  it('applies destructive variant class', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')
  })

  it('applies ghost variant class', () => {
    render(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('hover:bg-accent')
  })

  it('applies sm size class', () => {
    render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-8')
  })

  it('applies lg size class', () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10')
  })

  it('spreads additional props (e.g. aria-label)', () => {
    render(<Button aria-label="submit-trip">Submit</Button>)
    expect(screen.getByRole('button', { name: /submit-trip/i })).toBeInTheDocument()
  })
})
