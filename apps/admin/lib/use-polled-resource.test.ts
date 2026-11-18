import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  POLLED_RESOURCE_FALLBACK_ERROR,
  usePolledResource,
} from "./use-polled-resource";
import type { PolledResourceFailure } from "./use-polled-resource";

interface Progress {
  active: boolean;
  added: number;
  success: true;
}

const INTERVAL_MS = 5000;

function createProgress(overrides: Partial<Progress> = {}): Progress {
  return { active: false, added: 0, success: true, ...overrides };
}

function renderPolledResource(
  initialData: Progress,
  fetcher: () => Promise<Progress | PolledResourceFailure>
) {
  return renderHook(() =>
    usePolledResource({
      fetcher,
      initialData,
      intervalMs: INTERVAL_MS,
      isActive: (data) => data.active,
    })
  );
}

describe(usePolledResource, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the initial data without fetching it", async () => {
    const fetcher = vi.fn<() => Promise<Progress>>();
    const initialData = createProgress({ added: 3 });

    const { result } = renderPolledResource(initialData, fetcher);

    expect(result.current.data).toBe(initialData);
    expect(result.current.error).toBeNull();

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS * 3));

    // Nothing is in progress, so the data is never fetched again.
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetches the data again at the interval while it is active", async () => {
    const fetcher = vi
      .fn<() => Promise<Progress>>()
      .mockResolvedValueOnce(createProgress({ active: true, added: 1 }))
      .mockResolvedValueOnce(createProgress({ active: true, added: 2 }));

    const { result } = renderPolledResource(
      createProgress({ active: true }),
      fetcher
    );

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS - 1));

    expect(fetcher).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result.current.data.added).toBe(1);

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS));

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.data.added).toBe(2);
  });

  it("stops fetching once the data is no longer active", async () => {
    const fetcher = vi
      .fn<() => Promise<Progress>>()
      .mockResolvedValue(createProgress({ added: 5 }));

    const { result } = renderPolledResource(
      createProgress({ active: true }),
      fetcher
    );

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS));

    expect(result.current.data).toStrictEqual(createProgress({ added: 5 }));

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS * 3));

    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("starts fetching when a reload finds the data active", async () => {
    const fetcher = vi
      .fn<() => Promise<Progress>>()
      .mockResolvedValueOnce(createProgress({ active: true }))
      .mockResolvedValue(createProgress({ added: 4 }));

    const { result } = renderPolledResource(createProgress(), fetcher);

    await act(() => result.current.reload());

    expect(result.current.data.active).toBeTruthy();

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS));

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.data).toStrictEqual(createProgress({ added: 4 }));
  });

  it("stops fetching when it is unmounted", async () => {
    const fetcher = vi
      .fn<() => Promise<Progress>>()
      .mockResolvedValue(createProgress({ active: true }));

    const { unmount } = renderPolledResource(
      createProgress({ active: true }),
      fetcher
    );

    unmount();
    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS * 2));

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps the data and tells why when a reload fails", async () => {
    const initialData = createProgress({ added: 3 });
    const fetcher = vi
      .fn<() => Promise<Progress | PolledResourceFailure>>()
      .mockResolvedValue({ error: "Redis に接続できません", success: false });

    const { result } = renderPolledResource(initialData, fetcher);

    await act(() => result.current.reload());

    expect(result.current.data).toBe(initialData);
    expect(result.current.error).toBe("Redis に接続できません");
  });

  it("clears the error once a retry succeeds", async () => {
    const fetcher = vi
      .fn<() => Promise<Progress | PolledResourceFailure>>()
      .mockResolvedValueOnce({
        error: "Redis に接続できません",
        success: false,
      })
      .mockResolvedValueOnce(createProgress({ added: 7 }));

    const { result } = renderPolledResource(createProgress(), fetcher);

    await act(() => result.current.reload());
    await act(() => result.current.reload());

    expect(result.current.data.added).toBe(7);
    expect(result.current.error).toBeNull();
  });

  it("keeps fetching at the interval after a reload failed", async () => {
    const fetcher = vi
      .fn<() => Promise<Progress | PolledResourceFailure>>()
      .mockResolvedValueOnce({ error: "timeout", success: false })
      .mockResolvedValueOnce(createProgress({ added: 2 }));

    const { result } = renderPolledResource(
      createProgress({ active: true }),
      fetcher
    );

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS));

    expect(result.current.error).toBe("timeout");

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS));

    expect(result.current.data.added).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it("falls back to a general error when the reason is not known", async () => {
    const fetcher = vi
      .fn<() => Promise<Progress | PolledResourceFailure>>()
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce({ success: false });

    const { result } = renderPolledResource(createProgress(), fetcher);

    await act(() => result.current.reload());

    expect(result.current.error).toBe(POLLED_RESOURCE_FALLBACK_ERROR);

    await act(() => result.current.reload());

    expect(result.current.error).toBe(POLLED_RESOURCE_FALLBACK_ERROR);
  });

  it("replaces the data when the server sends it again", async () => {
    const fetcher = vi
      .fn<() => Promise<Progress | PolledResourceFailure>>()
      .mockResolvedValueOnce(createProgress({ added: 2 }))
      .mockResolvedValueOnce({ error: "timeout", success: false });
    const fromServer = createProgress({ active: true, added: 8 });

    const { rerender, result } = renderHook(
      ({ initialData }) =>
        usePolledResource({
          fetcher,
          initialData,
          intervalMs: INTERVAL_MS,
          isActive: (data) => data.active,
        }),
      { initialProps: { initialData: createProgress() } }
    );

    await act(() => result.current.reload());
    await act(() => result.current.reload());

    expect(result.current.data.added).toBe(2);
    expect(result.current.error).toBe("timeout");

    rerender({ initialData: fromServer });

    // What the server read is newer than what was fetched, and it loaded.
    expect(result.current.data).toBe(fromServer);
    expect(result.current.error).toBeNull();

    fetcher.mockResolvedValue(createProgress({ added: 9 }));
    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS));

    // The data from the server is in progress, so it is fetched again.
    expect(result.current.data.added).toBe(9);
  });

  it("keeps the fetched data while the server sends the same data", async () => {
    const fetcher = vi
      .fn<() => Promise<Progress>>()
      .mockResolvedValue(createProgress({ added: 2 }));
    const initialData = createProgress();

    const { rerender, result } = renderHook(
      ({ initialData }) =>
        usePolledResource({
          fetcher,
          initialData,
          intervalMs: INTERVAL_MS,
          isActive: (data) => data.active,
        }),
      { initialProps: { initialData } }
    );

    await act(() => result.current.reload());
    rerender({ initialData });

    expect(result.current.data.added).toBe(2);
  });

  it("calls the latest fetcher without restarting the interval", async () => {
    const first = vi.fn<() => Promise<Progress>>();
    const second = vi
      .fn<() => Promise<Progress>>()
      .mockResolvedValue(createProgress({ active: true, added: 9 }));

    const initialData = createProgress({ active: true });

    const { rerender, result } = renderHook(
      ({ fetcher }) =>
        usePolledResource({
          fetcher,
          initialData,
          intervalMs: INTERVAL_MS,
          isActive: (data) => data.active,
        }),
      { initialProps: { fetcher: first } }
    );

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS - 1));
    rerender({ fetcher: second });
    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(result.current.data.added).toBe(9);
  });
});
