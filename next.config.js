// eslint-disable-next-line @typescript-eslint/no-var-requires
const withTypescript = require('@zeit/next-typescript')

module.exports = withTypescript({
  env: {
    ALGOLIA_API_KEY: process.env.ALGOLIA_API_KEY,
    ALGOLIA_APPLICATION_ID: process.env.ALGOLIA_APPLICATION_ID,
    ALGOLIA_INDEX_NAME: process.env.ALGOLIA_INDEX_NAME,
    ANIMARE_SEARCH_BASE_URL: process.env.ANIMARE_SEARCH_BASE_URL,
    ANIMARE_SEARCH_DESCRIPTION: process.env.ANIMARE_SEARCH_DESCRIPTION,
    ANIMARE_SEARCH_TITLE: process.env.ANIMARE_SEARCH_TITLE
  },
  target: 'serverless'
})
