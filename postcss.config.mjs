const config = {
  plugins: [
    [
      '@fullhuman/postcss-purgecss',
      {
        content: ['./pages/**/*.{mdx,tsx}', './components/**/*.{mdx,tsx}'],
        defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
        safelist: ['html', 'body', 'data-theme', /^data-reach-/]
      }
    ],
    'postcss-flexbugs-fixes',
    [
      'postcss-preset-env',
      {
        autoprefixer: {
          flexbox: 'no-2009'
        },
        features: {
          'custom-properties': false
        },
        stage: 3
      }
    ]
  ]
}

export default config
