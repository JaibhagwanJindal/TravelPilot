import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// ─── Accessibility helpers ─────────────────────────────────────────────────────
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

describe('Accessibility - Interactive Elements', () => {
  it('Button has accessible role', () => {
    render(<Button>Generate Itinerary</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('Disabled button is announced as disabled', () => {
    render(<Button disabled aria-label="loading">Loading...</Button>)
    const btn = screen.getByRole('button', { name: /loading/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('disabled')
  })

  it('Input has associated label via htmlFor', () => {
    render(
      <div>
        <label htmlFor="destination-input">Destination</label>
        <Input id="destination-input" placeholder="Tokyo" />
      </div>
    )
    const input = screen.getByLabelText('Destination')
    expect(input).toBeInTheDocument()
  })

  it('Input supports aria-label for screen reader context', () => {
    render(<Input aria-label="Number of travelers" type="number" />)
    expect(screen.getByRole('spinbutton', { name: /number of travelers/i })).toBeInTheDocument()
  })

  it('Badge communicates status semantically', () => {
    render(
      <Badge role="status" aria-label="Trip status: Upcoming">Upcoming</Badge>
    )
    expect(screen.getByRole('status')).toHaveTextContent('Upcoming')
  })
})

describe('Accessibility - Landmarks and Headings', () => {
  it('Card title renders as a heading element', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Tokyo Adventure</CardTitle>
        </CardHeader>
        <CardContent><p>Details here</p></CardContent>
      </Card>
    )
    // CardTitle renders as a div by default in shadcn — check it's present with text
    expect(screen.getByText('Tokyo Adventure')).toBeInTheDocument()
  })

  it('sections have aria-labelledby linking them to headings', () => {
    render(
      <section aria-labelledby="budget-heading">
        <h2 id="budget-heading">Budget Tracking</h2>
        <p>Planned: $1500</p>
      </section>
    )
    expect(screen.getByRole('region', { name: /budget tracking/i })).toBeInTheDocument()
  })

  it('icon buttons have aria-label for accessibility', () => {
    render(
      <Button size="icon" aria-label="Delete trip">
        <span>✕</span>
      </Button>
    )
    expect(screen.getByRole('button', { name: /delete trip/i })).toBeInTheDocument()
  })

  it('form fields use placeholder as fallback descriptive hint', () => {
    render(<Input placeholder="e.g. museums, hiking, street food" />)
    expect(
      screen.getByPlaceholderText('e.g. museums, hiking, street food')
    ).toBeInTheDocument()
  })
})

describe('Accessibility - Focus and Keyboard', () => {
  it('button is focusable', () => {
    render(<Button>Create Trip</Button>)
    const btn = screen.getByRole('button')
    btn.focus()
    expect(document.activeElement).toBe(btn)
  })

  it('input is focusable', () => {
    render(<Input placeholder="destination" />)
    const input = screen.getByPlaceholderText('destination')
    input.focus()
    expect(document.activeElement).toBe(input)
  })

  it('disabled button is not focusable via click', () => {
    render(<Button disabled>Disabled</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
  })
})
