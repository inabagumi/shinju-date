export interface Logger {
  debug: (message: string, attributes?: Record<string, unknown>) => void;
  error: (message: string, attributes?: Record<string, unknown>) => void;
  info: (message: string, attributes?: Record<string, unknown>) => void;
  warn: (message: string, attributes?: Record<string, unknown>) => void;
}

/** Does nothing with a message. */
const noop = (): void => {
  // The messages are not logged.
};

/** A logger that logs nothing. */
export const silentLogger: Logger = {
  debug: noop,
  error: noop,
  info: noop,
  warn: noop,
};
