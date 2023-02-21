const config = {
  plugins: [
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
    ],
    [
      '@fullhuman/postcss-purgecss',
      {
        content: ['./app/**/*.{mdx,tsx}', './ui/**/*.{mdx,tsx}'],
        defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
        safelist: ['html', 'body', 'data-theme', /^data-reach-/]
      }
    ]
  ]
}

export default config
