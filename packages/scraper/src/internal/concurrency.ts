import PQueue from 'p-queue'

/**
 * Runs `task` for every item with at most `concurrency` tasks in flight and
 * counts the items it changed.
 *
 * One failing item does not stop the others: its error goes to `onError`. An
 * item counts unless its task resolves to `false` ("nothing to do").
 */
export async function countChanges<T>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<boolean | undefined>,
  onError: (error: unknown, item: T) => void,
): Promise<number> {
  const queue = new PQueue({ concurrency })
  const results = await Promise.allSettled(
    items.map((item) => queue.add(() => task(item))),
  )
  let count = 0

  for (const [index, result] of results.entries()) {
    if (result.status === 'rejected') {
      onError(result.reason, items[index] as T)
    } else if (result.value !== false) {
      count++
    }
  }

  return count
}
