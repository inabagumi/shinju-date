module.exports = {
  moduleNameMapper: {
    '^@/(.+)$': '<rootDir>/src/$1'
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  testURL: 'https://shinju-date.test'
}
