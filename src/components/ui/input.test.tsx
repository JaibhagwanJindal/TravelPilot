import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from '@/components/ui/input'

describe('Input component', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter destination" />)
    expect(screen.getByPlaceholderText('Enter destination')).toBeInTheDocument()
  })

  it('renders as an input element type', () => {
    render(<Input placeholder="test" />)
    const input = screen.getByPlaceholderText('test')
    expect(input.tagName).toBe('INPUT')
  })

  it('renders number input type', () => {
    render(<Input type="number" placeholder="travelers" />)
    const input = screen.getByPlaceholderText('travelers')
    expect(input).toHaveAttribute('type', 'number')
  })

  it('renders disabled input', () => {
    render(<Input placeholder="disabled" disabled />)
    expect(screen.getByPlaceholderText('disabled')).toBeDisabled()
  })

  it('applies additional className', () => {
    render(<Input className="my-custom" placeholder="custom" />)
    expect(screen.getByPlaceholderText('custom')).toHaveClass('my-custom')
  })

  it('has accessible label association via id', () => {
    render(
      <>
        <label htmlFor="dest">Destination</label>
        <Input id="dest" placeholder="Tokyo" />
      </>
    )
    expect(screen.getByLabelText('Destination')).toBeInTheDocument()
  })
})
