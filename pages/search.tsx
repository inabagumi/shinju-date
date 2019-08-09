import classNames from 'classnames'
import { NextPageContext } from 'next'
import Head from 'next/head'
import React, { Component, ReactElement, createRef } from 'react'
import Spinner from '../components/atoms/spinner'
import SearchResults from '../components/molecules/search-results'
import search from '../lib/search'
import { getTitle } from '../lib/title'
import Video from '../types/video'

export interface SearchProps {
  hasNext: boolean
  hits: Video[]
  query: string
}

export interface SearchState {
  hasNext: boolean
  isLoading: boolean
  page: number
  query: string
  results: Video[]
}

class Search extends Component<SearchProps, SearchState> {
  public static async getInitialProps({
    query
  }: NextPageContext): Promise<SearchProps> {
    const q = Array.isArray(query.q) ? query.q[0] : query.q
    const { hits, nbPages } = await search<Video>(q)

    if (typeof window !== 'undefined') window.scrollTo(0, 0)

    return {
      hasNext: nbPages > 1,
      hits,
      query: q
    }
  }

  public static getDerivedStateFromProps(
    nextProps: SearchProps,
    prevState: SearchState
  ): Pick<SearchState, 'hasNext' | 'page' | 'query' | 'results'> | null {
    if (prevState.isLoading || prevState.query === nextProps.query) return null

    return {
      hasNext: nextProps.hasNext,
      page: 0,
      query: nextProps.query,
      results: nextProps.hits
    }
  }

  public state = {
    hasNext: this.props.hasNext,
    isLoading: false,
    page: 0,
    query: this.props.query,
    results: this.props.hits
  }

  private targetRef = createRef<HTMLElement>()
  private intersectionObserver?: IntersectionObserver

  public componentDidMount(): void {
    this.intersectionObserver = new IntersectionObserver(this.handleIntersect, {
      rootMargin: '300px 0px 0px'
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.intersectionObserver.observe(this.targetRef.current!)
  }

  public shouldComponentUpdate(
    nextProps: SearchProps,
    nextState: SearchState
  ): boolean {
    return (
      this.state.isLoading !== nextState.isLoading ||
      this.state.page !== nextState.page ||
      this.props.query !== nextProps.query
    )
  }

  public componentWillUnmount(): void {
    if (this.intersectionObserver) this.intersectionObserver.disconnect()
  }

  private handleIntersect: IntersectionObserverCallback = (entries): void => {
    const { hasNext, isLoading } = this.state

    if (
      isLoading ||
      !hasNext ||
      !entries.some((entry): boolean => entry.isIntersecting)
    ) {
      return
    }

    this.setState({ isLoading: true })

    const { page, query } = this.state

    search<Video>(query, { page: page + 1 })
      .then(({ hits, nbPages, page: actualPage }): void => {
        this.setState(
          (prevState): Pick<SearchState, 'hasNext' | 'page' | 'results'> => ({
            page: actualPage,
            results: prevState.results.concat(hits),
            hasNext: actualPage <= nbPages
          })
        )
      })
      .catch((): void => {
        this.setState({ hasNext: false })
      })
      .finally((): void => {
        this.setState({ isLoading: false })
      })
  }

  public render(): ReactElement {
    const { isLoading, query, results } = this.state

    const title = [query, getTitle()].filter(Boolean).join(' - ')
    const description = process.env.ANIMARE_SEARCH_DESCRIPTION
    const baseUrl = process.env.ANIMARE_SEARCH_BASE_URL || 'https://example.com'
    const path = query ? `/search?q=${encodeURIComponent(query)}` : '/'

    return (
      <>
        <Head>
          <title>{title}</title>

          {description && <meta content={description} name="description" />}
          {query && <meta content="noindex,follow" name="robots" />}

          <link href={baseUrl + path} rel="canonical" />

          <meta content={description} property="og:description" />
          <meta
            content={`${baseUrl}/static/main-visual.png`}
            property="og:image"
          />
          <meta content={title} property="og:title" />
          <meta content="website" property="og:type" />
          <meta content={baseUrl + path} property="og:url" />

          <meta content="summary_large_image" name="twitter:card" />
        </Head>

        <main>
          <SearchResults values={results} />

          <footer className="search__footer" ref={this.targetRef}>
            <div
              className={classNames('search__loading', {
                'search__loading--show': isLoading
              })}
            >
              <Spinner aria-label="読み込み中..." />
            </div>
          </footer>
        </main>

        <style jsx>{`
          .search__footer {
            padding: 2rem 0;
          }

          .search__loading {
            align-items: center;
            display: none;
            height: 100%;
            justify-content: center;
          }

          .search__loading--show {
            display: flex;
          }
        `}</style>
      </>
    )
  }
}

export default Search
