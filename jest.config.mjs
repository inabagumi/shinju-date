import { defaults } from 'jest-config'

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  testPathIgnorePatterns: [...defaults.testPathIgnorePatterns, '/.next/'],
  testURL: 'https://shinju-date.test',
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest']
  }
}

export default config
