'use client'

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'
import { Temporal } from 'temporal-polyfill'
import { timeZone } from '@/lib/constants'

type TimerContextValue = {
  now?: Temporal.ZonedDateTime | undefined
}

const TimerContext = createContext<TimerContextValue>({})

export function TimerProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [now, setNow] = useState<Temporal.ZonedDateTime>()

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Temporal.Now.zonedDateTimeISO(timeZone))
    }, 60_000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  return (
    <TimerContext.Provider value={{ now }}>{children}</TimerContext.Provider>
  )
}

export function useNow(): Temporal.ZonedDateTime {
  const { now = Temporal.Now.zonedDateTimeISO(timeZone) } =
    useContext(TimerContext)

  return now
}
