import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotFoundPage } from './NotFoundPage'

describe('NotFoundPage', () => {
  it('показывает код 404 и ссылку возврата на дашборд', () => {
    render(
      <MemoryRouter initialEntries={['/some/unknown/route']}>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Страница не найдена')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /на дашборд/i })
    expect(link).toHaveAttribute('href', '/')
  })
})
