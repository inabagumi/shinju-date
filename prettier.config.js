import inabagumiPrettierConfig from '@inabagumi/prettier-config'

/** @type {import('prettier').Config} */
const prettierConfig = {
  ...inabagumiPrettierConfig,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindEntryPoint: './apps/admin/app/globals.css'
}

export default prettierConfig
