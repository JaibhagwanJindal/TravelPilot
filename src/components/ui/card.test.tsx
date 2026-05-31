import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

describe('Card component', () => {
  it('renders Card with children', () => {
    render(<Card><div>Card content</div></Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders CardHeader correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Trip to Tokyo</CardTitle>
          <CardDescription>A wonderful journey</CardDescription>
        </CardHeader>
      </Card>
    )
    expect(screen.getByText('Trip to Tokyo')).toBeInTheDocument()
    expect(screen.getByText('A wonderful journey')).toBeInTheDocument()
  })

  it('renders CardContent', () => {
    render(
      <Card>
        <CardContent>
          <p>Itinerary details here</p>
        </CardContent>
      </Card>
    )
    expect(screen.getByText('Itinerary details here')).toBeInTheDocument()
  })

  it('renders CardFooter', () => {
    render(
      <Card>
        <CardFooter>
          <button>View Trip</button>
        </CardFooter>
      </Card>
    )
    expect(screen.getByRole('button', { name: /view trip/i })).toBeInTheDocument()
  })

  it('applies additional className to Card', () => {
    const { container } = render(<Card className="custom-card">Content</Card>)
    expect(container.firstChild).toHaveClass('custom-card')
  })

  it('renders a complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Tokyo, Japan</CardTitle>
        </CardHeader>
        <CardContent>
          <p>5 days planned</p>
        </CardContent>
        <CardFooter>
          <button>View</button>
        </CardFooter>
      </Card>
    )
    expect(screen.getByText('Tokyo, Japan')).toBeInTheDocument()
    expect(screen.getByText('5 days planned')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument()
  })
})
