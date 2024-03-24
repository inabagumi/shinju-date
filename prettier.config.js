import inabagumiPrettierConfig from '@inabagumi/prettier-config'

/** @type {import('prettier').Config} */
const prettierConfig = {
  ...inabagumiPrettierConfig,
  plugins: ['prettier-plugin-tailwindcss']
}

export default prettierConfig
