import '@reach/skip-nav/styles.css'
import { Temporal } from '@js-temporal/polyfill'
import { SkipNavLink } from '@reach/skip-nav'
import {
  type ReactNode,
  type VFC,
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'
import Footer from './footer'
import styles from './layout.module.css'
import Navbar from './navbar'

export const DEFAULT_SKIP_NAV_CONTENT_ID = 'content'

type Value = {
  basePath: string
  baseTime: number
  now: number
}

const LayoutContext = createContext<Value>({
  basePath: '/',
  baseTime: 0,
  now: 0
})

export const LayoutProvider = LayoutContext.Provider

export function useBasePath(): string {
  const { basePath } = useContext(LayoutContext)

  return basePath
}

export function useBaseTime(): Temporal.Instant {
  const { baseTime } = useContext(LayoutContext)

  return Temporal.Instant.fromEpochSeconds(baseTime)
}

export function useNow(): Temporal.Instant {
  const { now } = useContext(LayoutContext)

  return Temporal.Instant.fromEpochSeconds(now)
}

type Props = {
  basePath?: string
  baseTime?: number
  children: ReactNode
}

const Layout: VFC<Props> = ({
  basePath = '/',
  baseTime = Temporal.Now.instant().epochSeconds,
  children
}) => {
  const [now, setNow] = useState(() => baseTime)

  useEffect(() => {
    let timeoutID: NodeJS.Timeout | undefined
    let requestID: number | undefined

    const updateNow = () => {
      setNow(Temporal.Now.instant().epochSeconds)

      timeoutID = setTimeout(() => {
        timeoutID = undefined

        requestID = requestAnimationFrame(() => {
          requestID = undefined

          updateNow()
        })
      }, 5_000)
    }

    updateNow()

    return () => {
      if (timeoutID) {
        clearInterval(timeoutID)
      }

      if (requestID) {
        cancelAnimationFrame(requestID)
      }
    }
  }, [])

  return (
    <LayoutProvider value={{ basePath, baseTime, now }}>
      <div className={styles.wrapper}>
        <SkipNavLink
          className={styles.skipNavLink}
          contentId={DEFAULT_SKIP_NAV_CONTENT_ID}
        >
          コンテンツにスキップ
        </SkipNavLink>

        <Navbar />

        <div className="padding-bottom--xl">{children}</div>

        <Footer />
      </div>
    </LayoutProvider>
  )
}

export default Layout
