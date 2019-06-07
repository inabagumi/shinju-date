import classNames from 'classnames'
import { NextContext } from 'next'
import Head from 'next/head'
import React, { Component, createRef } from 'react'
import SearchResults from '../components/molecules/search-results'
import search from '../lib/search'
import Video from '../types/video'

type Props = {
  hasNext: boolean
  hits: Video[]
  query: string
}

type State = {
  hasNext: boolean
  isLoading: boolean
  page: number
  query?: string
  results: Video[]
}

type Query = {
  q: string
}

export default class Search extends Component<Props, State> {
  static async getInitialProps({
    query: { q: query }
  }: NextContext<Query>): Promise<Props> {
    const { hits, nbPages } = await search<Video>(query)

    return { hasNext: nbPages > 1, hits, query }
  }

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (prevState.isLoading || prevState.query === nextProps.query) return null

    return {
      hasNext: nextProps.hasNext,
      page: 0,
      query: nextProps.query,
      results: nextProps.hits
    }
  }

  state = {
    hasNext: this.props.hasNext,
    isLoading: false,
    page: 0,
    query: this.props.query,
    results: this.props.hits
  }

  targetRef = createRef<HTMLDivElement>()
  intersectionObserver?: IntersectionObserver

  componentDidMount() {
    this.intersectionObserver = new IntersectionObserver(this.handleIntersect, {
      rootMargin: '200px 0px 0px'
    })

    this.intersectionObserver.observe(this.targetRef.current!)
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return (
      this.state.isLoading !== nextState.isLoading ||
      this.state.page !== nextState.page ||
      this.props.query !== nextProps.query
    )
  }

  componentWillUnmount() {
    if (this.intersectionObserver) this.intersectionObserver.disconnect()
  }

  handleIntersect: IntersectionObserverCallback = entries => {
    const { hasNext, isLoading } = this.state

    if (isLoading || !hasNext || !entries.some(entry => entry.isIntersecting))
      return

    const { page, query } = this.state

    this.setState({ isLoading: true })

    search<Video>(query, { page: page + 1 })
      .then(({ hits, nbPages, page: actualPage }) => {
        this.setState(prevState => ({
          page: actualPage,
          results: prevState.results.concat(hits),
          hasNext: actualPage <= nbPages
        }))
      })
      .catch(() => {
        this.setState({ hasNext: false })
      })
      .finally(() => this.setState({ isLoading: false }))
  }

  render() {
    const { isLoading, query, results } = this.state
    const path = query ? `/search?q=${encodeURIComponent(query)}` : '/'

    return (
      <>
        <Head>
          <title>
            {query ? `${query} - あにまーれサーチ` : 'あにまーれサーチ'}
          </title>

          <meta
            content="『あにまーれサーチ』は有閑喫茶 あにまーれのメンバーである因幡はねるさん、宇森ひなこさん、宗谷いちかさん、日ノ隈らんさんの 4 人が YouTube Live で配信した放送や投稿した動画の検索ができるウェブサービスです。"
            name="description"
          />

          {query && <meta content="noindex,follow" name="robots" />}

          <link href={`https://search.animare.cafe${path}`} rel="canonical" />
        </Head>

        <style jsx>{`
          .notfound {
            margin: 1rem;
          }

          .notfound p {
            color: #424242;
            font-size: 1rem;
            line-height: 1.5;
            margin: 10rem 0;
            padding: 0 0.5rem;
            text-align: center;
          }

          .footer {
            align-items: center;
            display: flex;
            justify-content: center;
          }

          @keyframes spinner {
            0% {
              transform: rotate(0deg);
            }

            100% {
              transform: rotate(360deg);
            }
          }

          .loading {
            animation: spinner 0.5s linear infinite;
            border: 4px solid transparent;
            border-radius: 50%;
            box-sizing: border-box;
            height: 36px;
            margin: 1rem;
            transition: border-color 0.2s ease;
            width: 36px;
          }

          .loading--show {
            border-bottom-color: #ffc107;
            border-left-color: #03a9f4;
            border-right-color: #e91e63;
            border-top-color: #4caf50;
          }
        `}</style>

        <main>
          {results.length > 0 ? (
            <SearchResults values={results} />
          ) : (
            <div className="notfound">
              <p>検索結果がありません</p>
            </div>
          )}

          <div className="footer" ref={this.targetRef}>
            <div
              className={classNames('loading', { 'loading--show': isLoading })}
            />
          </div>
        </main>
      </>
    )
  }
}
