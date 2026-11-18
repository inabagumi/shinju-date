export const min = (
  ...values: Temporal.ZonedDateTime[]
): Temporal.ZonedDateTime => {
  const [first, ...rest] = values;

  if (!first) {
    throw new TypeError("At least one argument is required.");
  }

  let result = first;

  for (const value of rest) {
    if (Temporal.ZonedDateTime.compare(result, value) > 0) {
      result = value;
    }
  }

  return result;
};
