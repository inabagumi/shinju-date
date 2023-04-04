export const Agent = await import('undici')
  .then(({ Agent }) => Agent)
  .catch(() => undefined)
