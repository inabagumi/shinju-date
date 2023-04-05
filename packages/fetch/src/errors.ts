export class ErrnoException extends Error {
  errno?: number | undefined
  code?: string | undefined
  path?: string | undefined
  syscall?: string | undefined
}
