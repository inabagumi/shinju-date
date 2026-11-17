import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import Avatar from '../avatar'

const IMAGE = { blur_data_url: 'data:image/png;base64,AAAA', id: 'icon' }

describe('Avatar', () => {
  test('should show the image as a decoration by default', () => {
    const { container } = render(
      <Avatar image={IMAGE} imageTestId="avatar" size={20} />,
    )
    const image = container.querySelector('img')

    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('sizes', '20px')
    expect(image?.getAttribute('src')).toContain('profile-images%2Ficon')
    expect(screen.getByTestId('avatar')).toHaveStyle({
      height: '20px',
      width: '20px',
    })
  })

  test('should leave the size to the class names without a size', () => {
    render(<Avatar className="size-20" image={IMAGE} imageTestId="avatar" />)
    const avatar = screen.getByTestId('avatar')

    expect(avatar).toHaveClass('size-20', 'rounded-full')
    expect(avatar).not.toHaveAttribute('style')
  })

  test('should show the default icon without an image', () => {
    const { container } = render(
      <Avatar fallbackTestId="fallback" image={null} size={20} />,
    )

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByTestId('fallback')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })

  test('should show the given fallback', () => {
    render(<Avatar fallback="A" fallbackTestId="fallback" image={null} />)

    expect(screen.getByTestId('fallback')).toHaveTextContent('A')
  })

  test('should announce the alternative text', () => {
    const { rerender } = render(<Avatar alt="朝霧ミオ" image={IMAGE} />)

    expect(screen.getByRole('img', { name: '朝霧ミオ' })).toBeInTheDocument()

    rerender(<Avatar alt="朝霧ミオ" image={null} />)

    expect(screen.getByRole('img', { name: '朝霧ミオ' })).toBeInTheDocument()
  })
})
