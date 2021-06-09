/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  env: {
    browser: true,
    node: true
  },
  extends: ['eslint:recommended', 'next', 'plugin:prettier/recommended'],
  overrides: [
    {
      files: ['**/*.ts?(x)'],
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended'
      ],
      rules: {
        'react/prop-types': 'off'
      }
    },
    {
      env: {
        commonjs: true
      },
      files: [
        '.eslintrc.js',
        'babel.config.js',
        'jest.config.js',
        'next.config.js',
        'prettier.config.js'
      ],
      parserOptions: {
        sourceType: 'script'
      }
    }
  ],
  root: true
}
