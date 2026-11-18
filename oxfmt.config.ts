import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    ".agents/skills/next-*",
    ".devcontainer/devcontainer-lock.json",
    "packages/database/types/supabase.ts",
    "skills-lock.json",
  ],
});
