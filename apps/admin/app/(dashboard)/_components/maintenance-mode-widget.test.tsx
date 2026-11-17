import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  disableMaintenanceMode: vi.fn(),
  enableMaintenanceMode: vi.fn(),
}))

vi.mock('../_lib/maintenance-mode-actions', () => ({
  disableMaintenanceMode: mocks.disableMaintenanceMode,
  enableMaintenanceMode: mocks.enableMaintenanceMode,
}))

const { MaintenanceModeWidget } = await import('./maintenance-mode-widget')

function toggle() {
  fireEvent.click(
    screen.getByRole('switch', { name: 'メンテナンスモード切り替え' }),
  )
}

describe('MaintenanceModeWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks for confirmation before enabling', () => {
    render(<MaintenanceModeWidget initialStatus={false} />)

    toggle()

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('メンテナンスモードを有効にしますか？')
    expect(mocks.enableMaintenanceMode).not.toHaveBeenCalled()
    expect(screen.getByText('OFF')).toBeInTheDocument()
  })

  it('enables maintenance mode after confirmation', async () => {
    mocks.enableMaintenanceMode.mockResolvedValue({ success: true })
    render(<MaintenanceModeWidget initialStatus={false} />)

    toggle()
    fireEvent.click(screen.getByRole('button', { name: '有効にする' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(mocks.enableMaintenanceMode).toHaveBeenCalledTimes(1)
    expect(screen.getByText('ON')).toBeInTheDocument()
  })

  it('disables maintenance mode after confirmation', async () => {
    mocks.disableMaintenanceMode.mockResolvedValue({ success: true })
    render(<MaintenanceModeWidget initialStatus={true} />)

    toggle()
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'メンテナンスモードを無効にしますか？',
    )
    fireEvent.click(screen.getByRole('button', { name: '無効にする' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(mocks.disableMaintenanceMode).toHaveBeenCalledTimes(1)
    expect(screen.getByText('OFF')).toBeInTheDocument()
  })

  it('keeps the current state when cancelled', async () => {
    render(<MaintenanceModeWidget initialStatus={false} />)

    toggle()
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(mocks.enableMaintenanceMode).not.toHaveBeenCalled()
    expect(screen.getByText('OFF')).toBeInTheDocument()
  })

  it('shows the error in the dialog when the action fails', async () => {
    mocks.enableMaintenanceMode.mockResolvedValue({ success: false })
    render(<MaintenanceModeWidget initialStatus={false} />)

    toggle()
    fireEvent.click(screen.getByRole('button', { name: '有効にする' }))

    expect(
      await screen.findByText('メンテナンスモードの有効化に失敗しました。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('OFF')).toBeInTheDocument()
  })
})
