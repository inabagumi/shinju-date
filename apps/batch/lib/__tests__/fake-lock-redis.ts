interface SetOptions {
  ex?: number
  nx?: boolean
}

/**
 * The subset of Redis the cron lock uses, kept in memory. Keys do not run
 * out by themselves; a test expires one with `delete`.
 */
export class FakeLockRedis {
  /** Makes the next script fail, like Redis does when it is unreachable. */
  evalFails = false
  readonly ttls = new Map<string, number>()
  readonly values = new Map<string, string>()

  async set(
    key: string,
    value: string,
    { ex, nx }: SetOptions = {},
  ): Promise<'OK' | null> {
    if (nx && this.values.has(key)) {
      return null
    }

    this.values.set(key, value)

    if (ex === undefined) {
      this.ttls.delete(key)
    } else {
      this.ttls.set(key, ex)
    }

    return 'OK'
  }

  /**
   * Runs `RELEASE_LOCK_SCRIPT` of `../lock` the way Redis would, knowing it
   * by its first line. It is not imported, so that this file can be loaded
   * before `../redis` is mocked.
   */
  async eval(script: string, keys: string[], args: string[]): Promise<number> {
    if (this.evalFails) {
      this.evalFails = false

      throw new Error('Redis is down')
    }

    if (!script.startsWith('-- batch:release-lock\n')) {
      throw new Error('Unexpected script')
    }

    const [key = ''] = keys
    const [value] = args

    if (this.values.get(key) !== value) {
      return 0
    }

    this.delete(key)

    return 1
  }

  /** Removes the key, as when it runs out. */
  delete(key: string): void {
    this.values.delete(key)
    this.ttls.delete(key)
  }

  clear(): void {
    this.evalFails = false
    this.values.clear()
    this.ttls.clear()
  }
}
