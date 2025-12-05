import { describe, expect, it } from 'vitest'
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './Toast'

describe('Toast', () => {
  it('should export Toast component', () => {
    expect(Toast).toBeDefined()
  })

  it('should export ToastProvider component', () => {
    expect(ToastProvider).toBeDefined()
  })

  it('should export ToastViewport component', () => {
    expect(ToastViewport).toBeDefined()
  })

  it('should export ToastTitle component', () => {
    expect(ToastTitle).toBeDefined()
  })

  it('should export ToastDescription component', () => {
    expect(ToastDescription).toBeDefined()
  })

  it('should export ToastClose component', () => {
    expect(ToastClose).toBeDefined()
  })

  it('should export ToastAction component', () => {
    expect(ToastAction).toBeDefined()
  })

  it('should have correct display name for Toast', () => {
    expect(Toast.name).toBe('Toast')
  })

  it('should have correct display name for ToastViewport', () => {
    expect(ToastViewport.name).toBe('ToastViewport')
  })

  it('should have correct display name for ToastTitle', () => {
    expect(ToastTitle.name).toBe('ToastTitle')
  })

  it('should have correct display name for ToastDescription', () => {
    expect(ToastDescription.name).toBe('ToastDescription')
  })

  it('should have correct display name for ToastClose', () => {
    expect(ToastClose.name).toBe('ToastClose')
  })

  it('should have correct display name for ToastAction', () => {
    expect(ToastAction.name).toBe('ToastAction')
  })
})
