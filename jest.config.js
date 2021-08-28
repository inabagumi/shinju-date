module.exports = {
  moduleNameMapper: {
    '^@/assets/(.+)$': '<rootDir>/assets/$1',
    '^@/components/(.+)$': '<rootDir>/components/$1',
    '^@/pages/(.+)$': '<rootDir>/pages/$1',
    '^@/styles/(.+)$': '<rootDir>/styles/$1',
    '^@/types/(.+)$': '<rootDir>/types/$1',
    '^@/utils/(.+)$': '<rootDir>/utils/$1'
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  testURL: 'https://shinju-date.test'
}
