import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * `@shinju-date/msw-handlers/register` is loaded via `NODE_OPTIONS`, which is
 * inherited by child processes such as `tsc --showConfig` that Next.js spawns
 * during build and whose stdout is parsed. Anything written to stdout breaks
 * the build, so diagnostic logs must go to stderr.
 */
describe('stdout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('should not write to stdout when registering the server', async () => {
    vi.stubEnv('ENABLE_MSW', 'true')

    const stdoutWrite = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true)
    const consoleLog = vi.spyOn(console, 'log')
    const consoleInfo = vi.spyOn(console, 'info')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await import('../register.js')
    const { stopServer } = await import('../server.js')
    stopServer()

    expect(consoleLog).not.toHaveBeenCalled()
    expect(consoleInfo).not.toHaveBeenCalled()
    expect(stdoutWrite).not.toHaveBeenCalled()
  })
})
