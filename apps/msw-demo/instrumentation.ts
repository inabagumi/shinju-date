export async function register() {
  // Initialize MSW when explicitly enabled
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { startServer } = await import('@shinju-date/msw-handlers/server')
    startServer()
  }
}
