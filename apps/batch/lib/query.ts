import { createErrorResponse } from "@shinju-date/helpers";
import type { z } from "zod";

const formatIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.map(String).join(".");

  return path ? `${path}: ${issue.message}` : issue.message;
};

/**
 * Parses the query of `request` with `schema`.
 *
 * Returns the parsed value, or a 400 response that names every invalid
 * parameter. When a parameter is repeated, the last value is used.
 */
export const parseQuery = <T extends z.ZodType>(
  schema: T,
  request: Request
): z.output<T> | Response => {
  const { searchParams } = new URL(request.url);
  const result = schema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!result.success) {
    return createErrorResponse(
      `Invalid query parameters. ${result.error.issues.map(formatIssue).join("; ")}`,
      { status: 400 }
    );
  }

  return result.data;
};
