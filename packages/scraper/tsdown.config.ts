import { definePackageConfig } from "@shinju-date/config/tsdown";

export default definePackageConfig({
  entry: {
    index: "./src/index.ts",
    twitch: "./src/twitch/index.ts",
    youtube: "./src/youtube/index.ts",
  },
});
