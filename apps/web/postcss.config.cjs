// @ts-check

/** @type {import('postcss-load-config').Config} */
const postcssConfig = {
  plugins: {
    /* eslint-disable sort-keys */
    autoprefixer: {},
    '@csstools/postcss-bundler': {}
    /* eslint-enable sort-keys */
  }
}

module.exports = postcssConfig
