import { z } from 'zod'

/**
 * The environment variables of the admin app, checked against a schema.
 *
 * Imported by `register()` in `instrumentation.ts`, so a server without a
 * required variable stops on start with the names of every missing one,
 * instead of failing later on the first request that needs it.
 */

/**
 * An unset variable and an empty one (`KEY=` in a `.env` file) are both
 * treated as unset.
 */
function variable<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema)
}

function requiredString() {
  return variable(z.string({ error: 'is not set' }))
}

function requiredURL() {
  return variable(
    z.url({
      error: (issue) =>
        issue.input === undefined ? 'is not set' : 'is not a valid URL',
    }),
  )
}

function optionalString() {
  return variable(z.string().optional())
}

/** `true` only when the variable is `true`. */
function flag() {
  return variable(
    z
      .string()
      .optional()
      .transform((value) => value === 'true'),
  )
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_BASE_URL: variable(
    z.url({ error: 'is not a valid URL' }).default('http://localhost:4000'),
  ),
  NEXT_PUBLIC_SENTRY_DSN: optionalString(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredString(),
  NEXT_PUBLIC_SUPABASE_URL: requiredURL(),
  NEXT_PUBLIC_VERCEL_ENV: optionalString(),
})

/**
 * The keys of the YouTube and Twitch APIs, read by `@shinju-date/scraper` and
 * the API clients. MSW answers those APIs, so they are needed only without it.
 */
const API_KEY_NAMES = [
  'GOOGLE_API_KEY',
  'TWITCH_CLIENT_ID',
  'TWITCH_CLIENT_SECRET',
] as const

const serverEnvSchema = z
  .object({
    ENABLE_MSW: flag(),
    GOOGLE_API_KEY: optionalString(),
    MSW_SUPABASE_AUTHENTICATED: flag(),
    REVALIDATE_SECRET_TOKEN: optionalString(),
    REVALIDATE_URL: optionalString(),
    SUPABASE_SERVICE_ROLE_KEY: requiredString(),
    TWITCH_CLIENT_ID: optionalString(),
    TWITCH_CLIENT_SECRET: optionalString(),
    UPSTASH_REDIS_REST_TOKEN: requiredString(),
    UPSTASH_REDIS_REST_URL: requiredURL(),
    VERCEL_ENV: optionalString(),
  })
  .superRefine(
    (env, context) => {
      if (env.ENABLE_MSW) {
        return
      }

      for (const name of API_KEY_NAMES) {
        if (env[name] === undefined) {
          context.addIssue({
            code: 'custom',
            message: 'is not set (required unless ENABLE_MSW=true)',
            path: [name],
          })
        }
      }
    },
    // Runs even when another variable is already missing, so that the error
    // names every missing one at once.
    { when: () => true },
  )

/** The names of every variable in the schemas, for checking `turbo.json`. */
export const ENV_NAMES: readonly string[] = [
  ...Object.keys(publicEnvSchema.shape),
  ...Object.keys(serverEnvSchema.shape),
]

export type PublicEnv = z.output<typeof publicEnvSchema>

export type ServerEnv = z.output<typeof serverEnvSchema>

/** The variables read from `process.env`, by name. */
export type EnvSource = Readonly<Record<string, string | undefined>>

function toEnvError(issues: readonly z.core.$ZodIssue[]): Error {
  const details = issues.map(
    (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
  )

  return new Error(
    ['Missing or invalid environment variables:', ...details].join('\n'),
  )
}

/**
 * Checks the variables that the browser can also read.
 *
 * @throws {Error} When a variable is missing or invalid, listing every one.
 */
export function parsePublicEnv(source: EnvSource): PublicEnv {
  const result = publicEnvSchema.safeParse(source)

  if (!result.success) {
    throw toEnvError(result.error.issues)
  }

  return result.data
}

/**
 * Checks every variable of the server, the public ones included, at once.
 *
 * @throws {Error} When a variable is missing or invalid, listing every one.
 */
export function parseEnv(source: EnvSource): {
  publicEnv: PublicEnv
  serverEnv: ServerEnv
} {
  const publicResult = publicEnvSchema.safeParse(source)
  const serverResult = serverEnvSchema.safeParse(source)

  if (!publicResult.success || !serverResult.success) {
    throw toEnvError([
      ...(publicResult.error?.issues ?? []),
      ...(serverResult.error?.issues ?? []),
    ])
  }

  return { publicEnv: publicResult.data, serverEnv: serverResult.data }
}

/**
 * Next.js inlines `NEXT_PUBLIC_` variables into the browser bundle only where
 * they are read by their literal names, so they are listed one by one here.
 */
const publicSource: EnvSource = {
  NEXT_PUBLIC_BASE_URL: process.env['NEXT_PUBLIC_BASE_URL'],
  NEXT_PUBLIC_SENTRY_DSN: process.env['NEXT_PUBLIC_SENTRY_DSN'],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
  NEXT_PUBLIC_VERCEL_ENV: process.env['NEXT_PUBLIC_VERCEL_ENV'],
}

const isServer = typeof window === 'undefined'

const parsedEnv = isServer
  ? parseEnv({ ...process.env, ...publicSource })
  : { publicEnv: parsePublicEnv(publicSource), serverEnv: undefined }

/** The `NEXT_PUBLIC_` variables, which the browser can also read. */
export const publicEnv: PublicEnv = parsedEnv.publicEnv

/**
 * The variables only the server can read. Reading one in the browser throws,
 * because the browser bundle does not include them.
 */
export const serverEnv: ServerEnv =
  parsedEnv.serverEnv ??
  new Proxy({} as ServerEnv, {
    get(_target, name) {
      throw new TypeError(
        `The server environment variable ${String(name)} cannot be read in the browser.`,
      )
    },
  })
