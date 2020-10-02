import localForage from 'localforage'
import { useCallback, useEffect } from 'react'
import { useRecoilState } from 'recoil'
import { SetterOrUpdater } from 'recoil'

import themeState from '@/atoms/themeState'
import type { Theme } from '@/atoms/themeState'

const useTheme = (): [Theme, SetterOrUpdater<Theme>] => {
  const [theme, setTheme] = useRecoilState(themeState)

  const handlePrefersColorSchemeChange = useCallback(
    (event: MediaQueryListEvent): void => {
      const nextTheme = event.matches ? 'dark' : 'light'

      localForage
        .setItem<Theme>('theme', nextTheme)
        .then(() => {
          setTheme(nextTheme)
        })
        .catch((error) => {
          console.error(error)
        })
    },
    []
  )

  useEffect(() => {
    const mediaQueryList = matchMedia('(prefers-color-scheme: dark)')

    localForage
      .getItem<Theme>('theme')
      .then((value) => {
        const nextTheme =
          typeof value !== 'string'
            ? mediaQueryList.matches
              ? 'dark'
              : 'light'
            : value

        setTheme(nextTheme)
      })
      .catch(() => {
        setTheme(mediaQueryList.matches ? 'dark' : 'light')
      })

    mediaQueryList.addEventListener('change', handlePrefersColorSchemeChange)

    return (): void => {
      mediaQueryList.removeEventListener(
        'change',
        handlePrefersColorSchemeChange
      )
    }
  }, [])

  useEffect(() => {
    localForage
      .setItem<Theme>('theme', theme)
      .then(() => {
        setTheme(theme)
      })
      .catch((error) => {
        console.error(error)
      })
  }, [theme])

  return [theme, setTheme]
}

export default useTheme
