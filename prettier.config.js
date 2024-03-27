import { fileURLToPath } from 'node:url'
import inabagumiPrettierConfig from '@inabagumi/prettier-config'

/** @type {import('prettier').Config} */
const prettierConfig = {
  ...inabagumiPrettierConfig,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindEntryPoint: fileURLToPath(
    new URL('./apps/admin/app/globals.css', import.meta.url)
  )
}

export default prettierConfig
