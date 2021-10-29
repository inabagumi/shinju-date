/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['eslint:recommended', 'next/core-web-vitals', 'prettier'],
  overrides: [
    {
      files: ['**/*.ts?(x)'],
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended'
      ]
    },
    {
      env: {
        commonjs: true
      },
      files: ['next.config.js'],
      parserOptions: {
        sourceType: 'script'
      }
    }
  ],
  root: true
}
