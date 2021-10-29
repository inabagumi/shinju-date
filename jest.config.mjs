import { defaults } from 'jest-config'

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  moduleNameMapper: {
    '^@/assets/(.+)$': '<rootDir>/assets/$1',
    '^@/components/(.+)$': '<rootDir>/components/$1',
    '^@/pages/(.+)$': '<rootDir>/pages/$1',
    '^@/styles/(.+)$': '<rootDir>/styles/$1',
    '^@/types/(.+)$': '<rootDir>/types/$1',
    '^@/utils/(.+)$': '<rootDir>/utils/$1'
  },
  testPathIgnorePatterns: [...defaults.testPathIgnorePatterns, '/.next/'],
  testURL: 'https://shinju-date.test',
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest']
  }
}

export default config
