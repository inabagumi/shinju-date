module.exports = {
  plugins: [
    [
      '@fullhuman/postcss-purgecss',
      {
        content: ['./pages/**/*.{mdx,tsx}', './components/**/*.{mdx,tsx}'],
        safelist: ['html', 'data-theme', /^data-reach-skip-nav/]
      }
    ],
    'postcss-flexbugs-fixes',
    [
      'postcss-preset-env',
      {
        autoprefixer: {
          flexbox: 'no-2009'
        },
        stage: 3,
        features: {
          'custom-properties': false
        }
      }
    ]
  ]
}
