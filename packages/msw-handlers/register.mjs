/**
 * MSW Server Registration for Node.js
 * This file ensures MSW server is started before any application code runs.
 *
 * Note: This uses top-level await which requires Node.js 14.8+ and ES modules.
 */

if (process.env.ENABLE_MSW === 'true' && typeof process !== 'undefined') {
  const { startServer } = await import('@shinju-date/msw-handlers/server')
  startServer()
  console.log('✅ MSW server registered via --import flag')
}
