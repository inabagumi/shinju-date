module.exports = {
  extends: ['@inabagumi/react', 'plugin:@next/next/recommended'],
  parserOptions: {
    project: 'tsconfig.json'
  },
  rules: {
    '@next/next/no-html-link-for-pages': ['error', 'src/pages'],
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off'
  }
}
