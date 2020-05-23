# SHINJU DATE

[![Node.js CI](https://github.com/inabagumi/shinju-date/workflows/Node.js%20CI/badge.svg)](https://github.com/inabagumi/shinju-date/actions)

[SHINJU DATE](https://shinju.date/) is a web service that searches broadcasts by the YouTube Live. This service targets broadcasts by members of the 774 inc.

## Development

Requires an active account of [Algolia](https://www.algolia.com/).

- [Node.js](https://nodejs.org/en/)
- [Yarn](https://yarnpkg.com/en/)

```console
$ git clone https://github.com/inabagumi/shinju-date.git
$ cd shinju-date
$ cp .env.local.sample .env.local
$ nano .env
$ yarn install
$ yarn dev
```

## License

[MIT](LICENSE)
