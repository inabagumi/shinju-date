import { describe, expect, it, vi } from "vitest";

import { paginate } from "./paginate.js";
import type { Page } from "./paginate.js";

const pages = <T>(...list: Page<T>[]) => {
  const fetchPage = vi.fn<(cursor: string | undefined) => Promise<Page<T>>>(
    (cursor) => {
      const index = cursor === undefined ? 0 : Number(cursor);
      const page = list[index];

      if (!page) {
        return Promise.reject(new Error(`Unexpected cursor: ${cursor}`));
      }

      return Promise.resolve(page);
    }
  );

  return fetchPage;
};

describe(paginate, () => {
  it("fetches only the first page when it has no next page", async () => {
    const fetchPage = pages({ items: [1, 2], next: null });

    await expect(Array.fromAsync(paginate(fetchPage))).resolves.toStrictEqual([
      1, 2,
    ]);
    expect(fetchPage).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it.each([{ next: undefined }, { next: "" }])(
    "treats an undefined or empty position ($next) as the last page",
    async ({ next }) => {
      const fetchPage = pages({ items: ["a"], next });

      await expect(Array.fromAsync(paginate(fetchPage))).resolves.toStrictEqual(
        ["a"]
      );
      expect(fetchPage).toHaveBeenCalledOnce();
    }
  );

  it("follows the position of the next page until there is none", async () => {
    const fetchPage = pages(
      { items: [1, 2], next: "1" },
      { items: [], next: "2" },
      { items: [3], next: null }
    );

    await expect(Array.fromAsync(paginate(fetchPage))).resolves.toStrictEqual([
      1, 2, 3,
    ]);
    expect(fetchPage.mock.calls).toStrictEqual([[undefined], ["1"], ["2"]]);
  });

  it("yields the earlier pages and then throws the error of a page", async () => {
    const error = new Error("page 2 failed");
    const fetchPage = vi
      .fn<(cursor: string | undefined) => Promise<Page<number>>>()
      .mockResolvedValueOnce({ items: [1, 2], next: "p2" })
      .mockRejectedValueOnce(error);

    const seen: number[] = [];

    await expect(async () => {
      for await (const item of paginate(fetchPage)) {
        seen.push(item);
      }
    }).rejects.toBe(error);
    expect(seen).toStrictEqual([1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("fetches no further pages once the caller stops", async () => {
    const fetchPage = pages(
      { items: [1, 2], next: "1" },
      { items: [3], next: null }
    );

    const iterator = paginate(fetchPage);

    await expect(iterator.next()).resolves.toStrictEqual({
      done: false,
      value: 1,
    });
    // What `break` in `for await` does
    await iterator.return();

    expect(fetchPage).toHaveBeenCalledOnce();
  });
});
