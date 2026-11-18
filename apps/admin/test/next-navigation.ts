import type { useRouter } from "next/navigation";

/**
 * The router that `useRouter()` of `next/navigation` returns. Type the mocks
 * of its methods with it, e.g. `vi.fn<AppRouter["push"]>()`.
 */
export type AppRouter = ReturnType<typeof useRouter>;
