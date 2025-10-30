import { describe, expect, it } from 'vitest'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '../dialog'

describe('Dialog components', () => {
  it('should export Dialog component', () => {
    expect(Dialog).toBeDefined()
  })

  it('should export DialogTrigger component', () => {
    expect(DialogTrigger).toBeDefined()
  })

  it('should export DialogPortal component', () => {
    expect(DialogPortal).toBeDefined()
  })

  it('should export DialogOverlay component', () => {
    expect(DialogOverlay).toBeDefined()
  })

  it('should export DialogContent component', () => {
    expect(DialogContent).toBeDefined()
  })

  it('should export DialogTitle component', () => {
    expect(DialogTitle).toBeDefined()
  })

  it('should export DialogDescription component', () => {
    expect(DialogDescription).toBeDefined()
  })

  it('should export DialogClose component', () => {
    expect(DialogClose).toBeDefined()
  })
})
