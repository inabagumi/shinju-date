import PQueue from 'p-queue'

const DEFAULT_CONCURRENCY = 5

/**
 * Bounds how many API requests a scraper has in flight.
 *
 * One queue is shared by every method of a scraper, so the limit applies to
 * the scraper as a whole rather than to a single call.
 */
export class RequestQueue {
  readonly #queue: PQueue

  constructor(concurrency = DEFAULT_CONCURRENCY) {
    this.#queue = new PQueue({ concurrency })
  }

  /**
   * Runs a single task once a slot is free.
   */
  run<R>(task: () => Promise<R>): Promise<R> {
    return this.#queue.add(task)
  }

  /**
   * Runs `task` for every item, keeping input order.
   * Rejects with the first failure, like `Promise.all`.
   */
  map<T, R>(items: readonly T[], task: (item: T) => Promise<R>): Promise<R[]> {
    return Promise.all(items.map((item) => this.#queue.add(() => task(item))))
  }

  /**
   * Runs `task` for every item without letting one failure stop the others.
   * Results keep input order, like `Promise.allSettled`.
   */
  mapSettled<T, R>(
    items: readonly T[],
    task: (item: T) => Promise<R>,
  ): Promise<PromiseSettledResult<R>[]> {
    return Promise.allSettled(
      items.map((item) => this.#queue.add(() => task(item))),
    )
  }
}
