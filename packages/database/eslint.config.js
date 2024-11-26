// @ts-check

import baseEslintConfig from '@shinju-date/eslint-config'

const eslintConfig = [
  ...baseEslintConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
]

export default eslintConfig
