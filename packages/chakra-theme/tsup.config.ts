import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  entry: ['./src/index.ts'],
  format: ['cjs', 'esm'],
  onSuccess:
    'chakra-cli tokens ./dist/index.cjs --out ./dist/theming.types.d.ts --strict-component-types --strict-token-types --template augmentation',
  sourcemap: true,
  target: 'es2022'
})
