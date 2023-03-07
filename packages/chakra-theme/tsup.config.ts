import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  entry: ['./src/index.ts'],
  onSuccess:
    'chakra-cli tokens ./dist/index.cjs --out ./dist/theming.types.d.ts --strict-component-types --strict-token-types --template augmentation',
  format: ['cjs', 'esm'],
  target: 'es2022'
})
