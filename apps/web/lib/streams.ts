export function mix<T>(streams: ReadableStream<T>[]): ReadableStream<T> {
  return new ReadableStream<T>({
    async start(controller) {
      await Promise.all(
        streams.map(async (stream) => {
          const reader = stream.getReader()

          async function pump(): Promise<void> {
            const { done, value } = await reader.read()

            if (value) {
              controller.enqueue(value)
            }

            if (!done) {
              return pump()
            }
          }

          return pump()
        })
      )

      controller.close()
    }
  })
}
