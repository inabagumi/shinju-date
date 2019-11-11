# AniMare Search

[![Node.js CI](https://github.com/inabagumi/animare-search/workflows/Node.js%20CI/badge.svg)](https://github.com/inabagumi/animare-search/actions)

[AniMare Search](https://search.animare.cafe/) is a web service that searches broadcasts by the YouTube Live. This service targets broadcasts by members of the AniMare.

## Development

Requires an active account of [Algolia](https://www.algolia.com/).

- [Node.js](https://nodejs.org/en/)
- [Yarn](https://yarnpkg.com/en/)

```console
$ git clone https://github.com/inabagumi/animare-search.git
$ cd animare-search
$ echo ALGOLIA_API_KEY=xxx >> .env
$ echo ALGOLIA_APPLICATION_ID=xxx >> .env
$ echo ALGOLIA_INDEX_NAME=xxx >> .env
$ yarn install
$ yarn dev
```

## License

[MIT](LICENSE)
