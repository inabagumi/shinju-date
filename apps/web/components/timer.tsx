"use client";

import { TIME_ZONE } from "@shinju-date/constants";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface TimerContextValue {
  now?: Temporal.ZonedDateTime | undefined;
}

const TimerContext = createContext<TimerContextValue>({});

interface TimerProviderProps {
  children: ReactNode;
  /**
   * サーバーで取得した現在の時刻（`Temporal.ZonedDateTime` の文字列）。
   * サーバーでの描画とハイドレーションでは、どちらもこの時刻を使い、
   * マウントの後にブラウザの時計へ切り替える
   */
  initialNow: string;
}

export function TimerProvider({ children, initialNow }: TimerProviderProps) {
  const [now, setNow] = useState(() => Temporal.ZonedDateTime.from(initialNow));

  useEffect(() => {
    const tick = () => {
      setNow(Temporal.Now.zonedDateTimeISO(TIME_ZONE));
    };

    tick();

    const timer = setInterval(tick, 60_000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <TimerContext.Provider
      value={{
        now,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

/**
 * 現在の時刻。`TimerProvider` の中では、マウントまではプロバイダーに渡した
 * 最初の時刻を返すので、サーバーとブラウザで同じ値から描画が始まる。
 * プロバイダーの外では、その場の時計を読む。
 */
export function useNow(): Temporal.ZonedDateTime {
  const { now = Temporal.Now.zonedDateTimeISO(TIME_ZONE) } =
    useContext(TimerContext);

  return now;
}
