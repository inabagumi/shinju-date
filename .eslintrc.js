module.exports = {
  extends: ['@inabagumi/react', 'plugin:@next/next/recommended'],
  parserOptions: {
    project: 'tsconfig.json'
  },
  rules: {
    '@next/next/google-font-display': 'off',
    '@next/next/google-font-preconnect': 'off'
  }
}
