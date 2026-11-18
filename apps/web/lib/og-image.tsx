import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import sharp from "sharp";

import { SITE_THEME_COLOR } from "@/lib/site";
import { LOGO_PATH, LOGO_VIEW_BOX } from "@/lib/svg-symbols";

/** The size of the Open Graph images of the pages */
export const OG_IMAGE_SIZE = { height: 630, width: 1200 };

/** The type of the Open Graph images of the pages */
export const OG_IMAGE_CONTENT_TYPE = "image/png";

const TEXT_COLOR = SITE_THEME_COLOR;
const LOGO_HEIGHT = 48;
const LOGO_WIDTH = (LOGO_HEIGHT * 256) / 80;

/** The key visual, which the home page also shows */
const KEY_VISUAL_PATH = join(process.cwd(), "app/_assets/hero.jpg");
/** The key visual takes the right half of the image */
const KEY_VISUAL_SIZE = {
  height: OG_IMAGE_SIZE.height,
  width: OG_IMAGE_SIZE.width / 2,
};

/**
 * The center of the key visual, cut out to the right half of the image, as a
 * data URL. The key visual is drawn so that its center can be cut out.
 *
 * Reading a file stops the prerendering of an `opengraph-image`, so it is
 * cached. It changes only with a deployment, and is not data from outside,
 * so the cache is not remote.
 */
const loadKeyVisual = async (): Promise<string> => {
  "use cache";

  cacheLife("max");

  const jpeg = await sharp(await readFile(KEY_VISUAL_PATH))
    .resize(KEY_VISUAL_SIZE.width, KEY_VISUAL_SIZE.height, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();

  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
};

/**
 * The Open Graph image of a page: its title and the logo on the left half,
 * and the center of the key visual on the right half. The
 * `opengraph-image.tsx` of each page returns it.
 *
 * No fonts are passed, so `ImageResponse` fetches the fonts for the Japanese
 * characters by itself.
 */
export const createOgImage = async (title: string): Promise<ImageResponse> => {
  const keyVisualURL = await loadKeyVisual();

  return new ImageResponse(
    <div
      style={{
        backgroundColor: "#ffffff",
        display: "flex",
        height: "100%",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 64px",
          width: OG_IMAGE_SIZE.width - KEY_VISUAL_SIZE.width,
        }}
      >
        <div
          style={{
            color: TEXT_COLOR,
            display: "block",
            fontSize: 56,
            fontWeight: 700,
            lineClamp: 4,
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}
        >
          {title}
        </div>
        <svg
          aria-hidden="true"
          height={LOGO_HEIGHT}
          viewBox={LOGO_VIEW_BOX}
          width={LOGO_WIDTH}
        >
          <path d={LOGO_PATH} fill={TEXT_COLOR} />
        </svg>
      </div>
      {/* oxlint-disable-next-line nextjs/no-img-element -- ImageResponse（next/og）では next/image を使えないため */}
      <img
        alt=""
        height={KEY_VISUAL_SIZE.height}
        src={keyVisualURL}
        width={KEY_VISUAL_SIZE.width}
      />
    </div>,
    OG_IMAGE_SIZE
  );
};
