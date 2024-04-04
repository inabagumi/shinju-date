enum LoggerLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn'
}

type LoggerMetaValue =
  | LoggerMeta
  | LoggerMetaValue[]
  | boolean
  | number
  | string

type LoggerMeta = {
  [key: string]: LoggerMetaValue
}

type LoggerOptions = {
  level?: LoggerLevel | undefined
}

class Logger {
  level: LoggerLevel

  constructor({ level = LoggerLevel.Info }: LoggerOptions = {}) {
    this.level = level
  }

  #output(level: LoggerLevel, message: string, meta?: LoggerMeta) {
    const timestamp = new Date()

    console.log(
      JSON.stringify({
        ...meta,
        level,
        message,
        timestamp: timestamp.toISOString()
      })
    )
  }

  debug(message: string, meta?: LoggerMeta) {
    this.#output(LoggerLevel.Debug, message, meta)
  }

  info(message: string, meta?: LoggerMeta) {
    this.#output(LoggerLevel.Info, message, meta)
  }

  warn(message: string, meta?: LoggerMeta) {
    this.#output(LoggerLevel.Warn, message, meta)
  }
}

export function createLogger(options: LoggerOptions = {}) {
  return new Logger(options)
}

export const defaultLogger = createLogger()
