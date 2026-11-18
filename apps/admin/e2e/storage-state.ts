import { fileURLToPath } from "node:url";

/**
 * The browser state (cookies) that the setup project (`auth.setup.ts`) saves
 * after signing in. Every test except the ones of the login page starts with it.
 */
export const STORAGE_STATE = fileURLToPath(
  new URL("../playwright/.auth/admin.json", import.meta.url)
);
