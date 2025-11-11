import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import Breadcrumbs from '../breadcrumbs'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('Breadcrumbs', () => {
  test('should render with the site name', () => {
    render(<Breadcrumbs />)
    expect(screen.getByText('SHINJU DATE')).toBeInTheDocument()
  })
})
