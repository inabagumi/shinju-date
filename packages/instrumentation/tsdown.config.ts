import { definePackageConfig } from "@shinju-date/config/tsdown";

export default definePackageConfig({
  // Each entry is its own file, so the browser build (`./client`) does not
  // pull in the server code (`./server`), such as the profiler and MSW.
  entry: ["./src/server.ts", "./src/client.ts", "./src/next-config.ts"],
});
