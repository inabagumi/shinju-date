import { describe, expect, it } from "vitest";

import { RequestQueue } from "./request-queue.js";

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe(RequestQueue, () => {
  it("shares its limit across concurrent calls", async () => {
    const queue = new RequestQueue(2);
    let running = 0;
    let peak = 0;
    const task = async () => {
      running++;
      peak = Math.max(peak, running);
      await delay(5);
      running--;
    };

    await Promise.all([
      queue.mapSettled([1, 2, 3], task),
      queue.run(task),
      queue.run(task),
    ]);

    expect(peak).toBe(2);
  });

  it("reports failures of mapSettled per item", async () => {
    const queue = new RequestQueue();
    const error = new Error("boom");

    const results = await queue.mapSettled([1, 2], async (value) => {
      if (value === 2) {
        throw error;
      }

      return value;
    });

    expect(results).toStrictEqual([
      { status: "fulfilled", value: 1 },
      { reason: error, status: "rejected" },
    ]);
  });
});
