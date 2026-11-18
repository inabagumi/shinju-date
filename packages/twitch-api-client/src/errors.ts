/**
 * Returns the HTTP status a Helix call failed with, or `undefined` when
 * `error` does not carry one.
 *
 * twurple sets the status as `statusCode` on the errors of failed requests.
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) {
    return undefined;
  }

  const { statusCode } = error;

  return typeof statusCode === "number" && Number.isInteger(statusCode)
    ? statusCode
    : undefined;
}
