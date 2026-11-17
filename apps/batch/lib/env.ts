import { z } from 'zod'

/**
 * The environment variables of the batch app, checked against a schema.
 *
 * Imported by `register()` in `instrumentation.ts`, so a server without a
 * required variable stops on start with the names of every missing one,
 * instead of failing later on the first cron run that needs it.
 *
 * The Sentry settings (`NEXT_PUBLIC_SENTRY_DSN`, `VERCEL_ENV` and
 * `NEXT_PUBLIC_VERCEL_ENV`) are read only by `@shinju-date/instrumentation`,
 * so they are not listed here.
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
    /** Checked by the cron routes only when set. */
    CRON_SECRET: optionalString(),
    ENABLE_MSW: flag(),
    GOOGLE_API_KEY: optionalString(),
    NEXT_PUBLIC_SUPABASE_URL: requiredURL(),
    /** Sent by `@shinju-date/web-cache` with each revalidation request. */
    REVALIDATE_SECRET_TOKEN: optionalString(),
    /** Read by `@shinju-date/web-cache`, which skips revalidation without it. */
    REVALIDATE_URL: optionalString(),
    SUPABASE_SERVICE_ROLE_KEY: requiredString(),
    TWITCH_CLIENT_ID: optionalString(),
    TWITCH_CLIENT_SECRET: optionalString(),
    UPSTASH_REDIS_REST_TOKEN: requiredString(),
    UPSTASH_REDIS_REST_URL: requiredURL(),
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

/** The names of every variable in the schema, for checking `turbo.json`. */
export const ENV_NAMES: readonly string[] = Object.keys(serverEnvSchema.shape)

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
 * Checks every variable of the server at once.
 *
 * @throws {Error} When a variable is missing or invalid, listing every one.
 */
export function parseEnv(source: EnvSource): ServerEnv {
  const result = serverEnvSchema.safeParse(source)

  if (!result.success) {
    throw toEnvError(result.error.issues)
  }

  return result.data
}

/** The variables of the server. The batch app has no pages for the browser. */
export const serverEnv: ServerEnv = parseEnv(process.env)
