interface CreateErrorResponseOptions {
  status?: number;
}

export const createErrorResponse = (
  message: string,
  { status = 500 }: CreateErrorResponseOptions
) =>
  Response.json(
    {
      error: message,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status,
    }
  );
