import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";

import { fetchTalent } from "@/lib/data/talents";
import { SITE_THEME_COLOR } from "@/lib/site";
import { LOGO_PATH, LOGO_VIEW_BOX } from "@/lib/svg-symbols";
import { getTalentProfileImage } from "@/lib/talent-profile-image";

import { fetchTalentIconDataURL, getTalentThemeColor } from "./_lib/og-image";

export const alt = "SHINJU DATE";
export const size = { height: 630, width: 1200 };
export const contentType = "image/png";

const TEXT_COLOR = SITE_THEME_COLOR;
const ICON_SIZE = 320;
const LOGO_HEIGHT = 56;
const LOGO_WIDTH = (LOGO_HEIGHT * 256) / 80;

/**
 * The Open Graph image of a talent's page: the icon and the name of the
 * talent, with a band of its theme color on the left and the logo.
 *
 * All the text is on the white background, never on the theme color, whose
 * contrast with the text cannot be guaranteed. No fonts are passed, so
 * `ImageResponse` fetches the fonts for the Japanese characters by itself.
 *
 * Production would cache it as `immutable` for a year, which would keep an
 * old icon or name, so it is cached for a day instead.
 */
export default async function Image({
  params,
}: Pick<PageProps<"/talents/[id]">, "params">) {
  const { id } = await params;
  const talent = await fetchTalent(id);

  if (!talent) {
    notFound();
  }

  const icon = await fetchTalentIconDataURL(
    getTalentProfileImage(talent),
    ICON_SIZE
  );

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
          backgroundColor: getTalentThemeColor(talent.theme_color),
          height: "100%",
          width: 48,
        }}
      />
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flex: 1,
          padding: "0 80px",
          position: "relative",
        }}
      >
        {icon ? (
          // biome-ignore lint/performance/noImgElement: ImageResponse（next/og）では next/image を使えないため
          <img
            alt=""
            height={ICON_SIZE}
            src={icon}
            style={{ borderRadius: "50%" }}
            width={ICON_SIZE}
          />
        ) : (
          <div
            style={{
              backgroundColor: "#e5e5e5",
              borderRadius: "50%",
              flexShrink: 0,
              height: ICON_SIZE,
              width: ICON_SIZE,
            }}
          />
        )}
        <div
          style={{
            color: TEXT_COLOR,
            display: "block",
            flex: 1,
            fontSize: 72,
            fontWeight: 700,
            lineClamp: 2,
            lineHeight: 1.3,
            marginLeft: 64,
            wordBreak: "break-word",
          }}
        >
          {talent.name}
        </div>
        <svg
          aria-hidden="true"
          height={LOGO_HEIGHT}
          style={{ bottom: 48, position: "absolute", right: 64 }}
          viewBox={LOGO_VIEW_BOX}
          width={LOGO_WIDTH}
        >
          <path d={LOGO_PATH} fill={TEXT_COLOR} />
        </svg>
      </div>
    </div>,
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    }
  );
}
