import 'nprogress/css/nprogress.css'
import { useRouter } from 'next/router'
import NProgress from 'nprogress'
import { useCallback, useEffect } from 'react'
import type { NProgressOptions } from 'nprogress'
import type { VFC } from 'react'

type Props = {
  options?: Partial<NProgressOptions>
}

const ProgressBar: VFC<Props> = ({ options = {} }) => {
  const router = useRouter()

  const handleRouteChangeStart = useCallback(() => {
    NProgress.start()
  }, [])

  const handleRouteChangeComplete = useCallback(() => {
    NProgress.done()
  }, [])

  const handleRouteChangeError = useCallback(() => {
    NProgress.done()
  }, [])

  useEffect(() => {
    NProgress.configure(options)
  }, [options])

  useEffect(() => {
    router.events.on('routeChangeStart', handleRouteChangeStart)
    router.events.on('routeChangeComplete', handleRouteChangeComplete)
    router.events.on('routeChangeError', handleRouteChangeError)

    return (): void => {
      router.events.off('routeChangeStart', handleRouteChangeStart)
      router.events.off('routeChangeComplete', handleRouteChangeComplete)
      router.events.off('routeChangeError', handleRouteChangeError)
    }
  }, [
    router.events,
    handleRouteChangeStart,
    handleRouteChangeComplete,
    handleRouteChangeError
  ])

  return null
}

export default ProgressBar
