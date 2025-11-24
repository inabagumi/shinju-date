/**
 * Type declarations for Intl.DurationFormat
 * @see https://tc39.es/proposal-intl-duration-format/
 */

declare namespace Intl {
  interface DurationFormatOptions {
    style?: 'long' | 'short' | 'narrow' | 'digital'
    years?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit'
    months?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit'
    weeks?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit'
    days?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit'
    hours?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit'
    minutes?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit'
    seconds?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit'
    milliseconds?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit'
    microseconds?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit'
    nanoseconds?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit'
  }

  interface DurationFormat {
    format(duration: Temporal.Duration | Temporal.DurationLike): string
  }

  interface DurationFormatConstructor {
    new (
      locales?: string | string[],
      options?: DurationFormatOptions,
    ): DurationFormat
  }

  const DurationFormat: DurationFormatConstructor
}
