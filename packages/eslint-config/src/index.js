// @ts-check

import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended
})

const eslintConfig = tseslint.config(
  ...compat.config({
    extends: ['eslint:recommended', 'next/core-web-vitals', 'turbo', 'prettier']
  }),
  tseslint.configs.eslintRecommended,
  tseslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    rules: {
      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc'
          },
          groups: [
            ['builtin', 'external'],
            'internal',
            'parent',
            ['index', 'sibling'],
            'unknown',
            'type'
          ],
          'newlines-between': 'never',
          pathGroups: [
            {
              group: 'internal',
              pattern: '@/**'
            }
          ]
        }
      ],
      'react/jsx-sort-props': 'error',
      'react/sort-prop-types': 'error',
      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true
        }
      ],
      'sort-keys': [
        'error',
        'asc',
        {
          natural: true
        }
      ],
      'sort-vars': [
        'error',
        {
          ignoreCase: false
        }
      ]
    }
  }
)

export default eslintConfig
