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
    const { query, results } = this.state
    const path = query ? `/search?q=${encodeURIComponent(query)}` : '/'

    return (
      <>
        <Head>
          {query && <meta content="noindex,follow" name="robots" />}
          <link href={`https://search.animare.cafe${path}`} rel="canonical" />
        </Head>

        <style jsx>{`
          .notfound {
            align-items: center;
            display: flex;
            height: 100%;
            justify-content: center;
          }

          .notfound p {
            color: #424242;
            font-size: 1.25rem;
            line-height: 1.5;
            margin: 0;
            padding: 1rem 0.5rem;
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

          <div ref={this.targetRef} />
        </main>
      </>
    )
  }
}
