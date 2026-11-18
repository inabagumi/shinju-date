/**
 * Returns the HTTP status a YouTube Data API call failed with, or `undefined`
 * when `error` does not carry one.
 *
 * The status is read from `status`, `response.status` or `code`, whichever
 * the client set (`code` may be a string).
 */
export const getErrorStatus = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as {
    code?: unknown;
    response?: { status?: unknown };
    status?: unknown;
  };

  for (const value of [
    candidate.status,
    candidate.response?.status,
    candidate.code,
  ]) {
    const status = typeof value === "string" ? Number(value) : value;

    if (typeof status === "number" && Number.isInteger(status)) {
      return status;
    }
  }

  return undefined;
};
