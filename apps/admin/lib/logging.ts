import { type Logger, createLogger, format, transports } from 'winston'

function createDefaultLogger(): Logger {
  const logger = createLogger({
    format: format.combine(format.timestamp(), format.splat(), format.json()),
    level: 'info',
    transports: [new transports.Console()]
  })

  return logger
}

export const defaultLogger = createDefaultLogger()

export function captureException(error: unknown): void {
  if (error instanceof Error) {
    defaultLogger.error(error.message, {
      ...(error.cause instanceof Error
        ? {
            cause: {
              message: error.cause.message,
              name: error.cause.name,
              stack: error.cause.stack
            }
          }
        : {}),
      name: error.name,
      stack: error.stack
    })
  }
}
