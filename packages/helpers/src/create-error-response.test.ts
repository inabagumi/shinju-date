import { describe, expect, it } from "vitest";

import { createErrorResponse } from "./create-error-response.js";

describe(createErrorResponse, () => {
  it("should create an error response with default status 500", async () => {
    const response = createErrorResponse("Something went wrong", {});

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const json = await response.json();
    expect(json).toStrictEqual({ error: "Something went wrong" });
  });

  it("should create an error response with custom status", async () => {
    const response = createErrorResponse("Not found", { status: 404 });

    expect(response.status).toBe(404);

    const json = await response.json();
    expect(json).toStrictEqual({ error: "Not found" });
  });

  it("should create an unauthorized response", async () => {
    const response = createErrorResponse("Unauthorized", { status: 401 });

    expect(response.status).toBe(401);

    const json = await response.json();
    expect(json).toStrictEqual({ error: "Unauthorized" });
  });
});
