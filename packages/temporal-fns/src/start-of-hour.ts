export const startOfHour = (
  zdt: Temporal.ZonedDateTime
): Temporal.ZonedDateTime =>
  zdt.with({
    microsecond: 0,
    millisecond: 0,
    minute: 0,
    nanosecond: 0,
    second: 0,
  });
