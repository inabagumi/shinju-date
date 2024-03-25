// @ts-check

import nextJest from 'next/jest.js'

const createJestConfig = nextJest()

/** @type {import('@jest/types').Config.InitialOptions} */
const jestConfig = {
  testEnvironmentOptions: {
    url: 'https://shinju-date.test'
  }
}

export default createJestConfig(jestConfig)
