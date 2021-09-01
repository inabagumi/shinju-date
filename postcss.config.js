module.exports = {
  plugins: [
    [
      '@fullhuman/postcss-purgecss',
      {
        content: ['./pages/**/*.{mdx,tsx}', './components/**/*.{mdx,tsx}'],
        defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
        safelist: ['html', 'body', 'data-theme', /^data-reach-/, 'class']
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
