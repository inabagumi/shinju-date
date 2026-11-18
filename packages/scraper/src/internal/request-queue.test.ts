import { setTimeout as delay } from "node:timers/promises";

import { describe, expect, it } from "vitest";

import { RequestQueue } from "./request-queue.js";

describe(RequestQueue, () => {
  it("shares its limit across concurrent calls", async () => {
    const queue = new RequestQueue(2);
    let running = 0;
    let peak = 0;
    const task = async () => {
      running += 1;
      peak = Math.max(peak, running);
      await delay(5);
      running -= 1;
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

    const results = await queue.mapSettled([1, 2], (value) =>
      value === 2 ? Promise.reject(error) : Promise.resolve(value)
    );

    expect(results).toStrictEqual([
      { status: "fulfilled", value: 1 },
      { reason: error, status: "rejected" },
    ]);
  });
});
