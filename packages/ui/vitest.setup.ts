import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library unmounts the rendered components after each test only when
// `afterEach` is a global, and `globals` of Vitest is off.
afterEach(() => {
  cleanup()
})
