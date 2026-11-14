export interface Logger {
  debug(message: string, attributes?: Record<string, unknown>): void
  error(message: string, attributes?: Record<string, unknown>): void
  info(message: string, attributes?: Record<string, unknown>): void
  warn(message: string, attributes?: Record<string, unknown>): void
}
