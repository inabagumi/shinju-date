import type { Metadata, ResolvingMetadata } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchOldestVideoDate, fetchScheduleToday } from "@/lib/data/schedule";
import { fetchActiveTalents, fetchTalent } from "@/lib/data/talents";
import { SITE_DESCRIPTION, SITE_TAGLINE } from "@/lib/site";

import { metadata as aboutMetadata } from "./about/layout";
import { alt as aboutImageAlt } from "./about/opengraph-image";
import { alt as contactImageAlt } from "./contact/opengraph-image";
import { metadata as contactMetadata } from "./contact/page";
import { alt as feedbackImageAlt } from "./feedback/opengraph-image";
import { metadata as feedbackMetadata } from "./feedback/page";
import { metadata as homeMetadata } from "./page";
import { metadata as privacyMetadata } from "./privacy/layout";
import { alt as privacyImageAlt } from "./privacy/opengraph-image";
import { generateMetadata as generateScheduleWeekMetadata } from "./schedule/[date]/page";
import { alt as scheduleImageAlt } from "./schedule/opengraph-image";
import { metadata as scheduleMetadata } from "./schedule/page";
import { generateMetadata as generateTalentMetadata } from "./talents/[id]/page";
import { alt as talentsImageAlt } from "./talents/opengraph-image";
import { metadata as talentsMetadata } from "./talents/page";
import { metadata as termsMetadata } from "./terms/layout";
import { alt as termsImageAlt } from "./terms/opengraph-image";
import { generateMetadata as generateVideosMetadata } from "./videos/[[...queries]]/page";
import { alt as videosImageAlt } from "./videos/opengraph-image";

vi.mock(import("@/lib/data/schedule"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchOldestVideoDate: vi.fn<typeof fetchOldestVideoDate>(),
  fetchScheduleToday: vi.fn<typeof fetchScheduleToday>(),
}));

vi.mock(import("@/lib/data/talents"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchActiveTalents: vi.fn<typeof fetchActiveTalents>(),
  fetchTalent: vi.fn<typeof fetchTalent>(),
}));

const TALENT_ID = "00000000-0000-4000-8000-000000000001";

/** The image of `app/videos/opengraph-image.tsx`, as Next.js resolves it */
const VIDEOS_IMAGES = [
  {
    alt: "動画一覧",
    height: 630,
    type: "image/png",
    url: new URL("https://shinju-date.test/videos/opengraph-image?0123456789"),
    width: 1200,
  },
];

const generateVideosPageMetadata = (
  queries: string[] | undefined,
  searchParams: Record<string, string | string[]> = {},
  /** The images of the parent segment, which `null` leaves out */
  parentImages: typeof VIDEOS_IMAGES | null = VIDEOS_IMAGES
) => {
  // Only `openGraph.images` of the parent segment is read
  const parentMetadata = parentImages
    ? { openGraph: { images: parentImages } }
    : {};

  return generateVideosMetadata(
    {
      params: Promise.resolve(queries ? { queries } : {}),
      searchParams: Promise.resolve(searchParams),
    },
    Promise.resolve(parentMetadata as unknown as Awaited<ResolvingMetadata>)
  );
};

/**
 * The metadata of every page, written out in full. The pages build it with
 * `createPageMetadata`, so a change to that function shows up here as a change
 * to the pages.
 */
describe("metadata of the pages", () => {
  beforeEach(() => {
    vi.mocked(fetchActiveTalents).mockResolvedValue([
      { id: TALENT_ID, name: "朝霧ミオ" },
    ]);
    vi.mocked(fetchOldestVideoDate).mockResolvedValue("2020-01-01");
    vi.mocked(fetchScheduleToday).mockResolvedValue("2026-11-10");
  });

  it("home page", () => {
    expect(homeMetadata).toStrictEqual({
      alternates: {
        canonical: "/",
      },
      description: SITE_DESCRIPTION,
      openGraph: {
        description: SITE_DESCRIPTION,
        title: "SHINJU DATE",
        type: "website",
        url: "/",
      },
      title: {
        absolute: `SHINJU DATE - ${SITE_TAGLINE}`,
      },
      twitter: {
        card: "summary_large_image",
        title: "SHINJU DATE",
      },
    });
  });

  it.each([
    {
      metadata: aboutMetadata,
      name: "about",
      path: "/about",
      title: "SHINJU DATEとは?",
      type: "article",
    },
    {
      metadata: privacyMetadata,
      name: "privacy policy",
      path: "/privacy",
      title: "プライバシーポリシー",
      type: "article",
    },
    {
      metadata: termsMetadata,
      name: "terms of use",
      path: "/terms",
      title: "利用規約",
      type: "article",
    },
    {
      metadata: scheduleMetadata,
      name: "schedule of the current week",
      path: "/schedule",
      title: "配信スケジュール",
      type: "article",
    },
    {
      metadata: talentsMetadata,
      name: "list of talents",
      path: "/talents",
      title: "タレント一覧",
      type: "website",
    },
  ])("$name page", ({ metadata, path, title, type }) => {
    expect(metadata).toStrictEqual({
      alternates: {
        canonical: path,
      },
      openGraph: {
        siteName: "SHINJU DATE",
        title,
        type,
        url: path,
      },
      title,
      twitter: {
        card: "summary_large_image",
        title: `${title} - SHINJU DATE`,
      },
    });
  });

  it("schedule page of a week, which is not indexed", async () => {
    const metadata = await generateScheduleWeekMetadata({
      // A Tuesday. The canonical URL is that of the Sunday of the week.
      params: Promise.resolve({ date: "2026-11-10" }),
    });

    expect(metadata).toStrictEqual({
      alternates: {
        canonical: "/schedule/2026-11-08",
      },
      openGraph: {
        siteName: "SHINJU DATE",
        title: "2026年11月8日〜11月14日の配信スケジュール",
        type: "article",
        url: "/schedule/2026-11-08",
      },
      robots: {
        index: false,
      },
      title: "2026年11月8日〜11月14日の配信スケジュール",
      twitter: {
        card: "summary_large_image",
        title: "2026年11月8日〜11月14日の配信スケジュール - SHINJU DATE",
      },
    });
  });

  it("talent page", async () => {
    vi.mocked(fetchTalent).mockResolvedValue({
      id: TALENT_ID,
      name: "朝霧ミオ",
    } as Awaited<ReturnType<typeof fetchTalent>>);

    const metadata = await generateTalentMetadata({
      params: Promise.resolve({ id: TALENT_ID }),
    });

    expect(metadata).toStrictEqual({
      alternates: {
        canonical: `/talents/${TALENT_ID}`,
        types: {
          "text/calendar": `/talents/${TALENT_ID}.ics`,
        },
      },
      openGraph: {
        siteName: "SHINJU DATE",
        title: "朝霧ミオ",
        type: "profile",
        url: `/talents/${TALENT_ID}`,
      },
      title: "朝霧ミオ",
      twitter: {
        card: "summary_large_image",
        title: "朝霧ミオ - SHINJU DATE",
      },
    });
  });

  it("list of videos", async () => {
    const metadata = await generateVideosPageMetadata(undefined, {
      kind: "short",
    });

    expect(metadata).toStrictEqual({
      alternates: {
        canonical: "/videos",
        types: {
          "text/calendar": "/videos.ics?kind=short",
        },
      },
      openGraph: {
        images: VIDEOS_IMAGES,
        siteName: "SHINJU DATE",
        title: "動画一覧",
        type: "article",
        url: "/videos",
      },
      robots: {
        index: true,
      },
      title: "動画一覧",
      twitter: {
        card: "summary_large_image",
        title: "動画一覧 - SHINJU DATE",
      },
    });
  });

  it("search results, which are not indexed and have no calendar", async () => {
    const metadata = await generateVideosPageMetadata(["マイクラ"]);

    expect(metadata).toStrictEqual({
      alternates: {
        canonical: `/videos/${encodeURIComponent("マイクラ")}`,
        types: {
          "text/calendar": null,
        },
      },
      openGraph: {
        images: VIDEOS_IMAGES,
        siteName: "SHINJU DATE",
        title: "『マイクラ』の検索結果",
        type: "article",
        url: `/videos/${encodeURIComponent("マイクラ")}`,
      },
      robots: {
        index: false,
      },
      title: "『マイクラ』の検索結果",
      twitter: {
        card: "summary_large_image",
        title: "『マイクラ』の検索結果 - SHINJU DATE",
      },
    });
  });

  it("list of videos of a talent, which is not indexed", async () => {
    const metadata = await generateVideosPageMetadata(undefined, {
      talent: TALENT_ID,
    });

    expect(metadata.alternates).toStrictEqual({
      canonical: "/videos",
      types: {
        "text/calendar": `/videos.ics?talent=${TALENT_ID}`,
      },
    });
    expect(metadata.robots).toStrictEqual({ index: false });
  });

  it("contact page", () => {
    expect(contactMetadata).toStrictEqual({
      alternates: {
        canonical: "/contact",
      },
      description:
        "SHINJU DATEに関するお問い合わせフォームです。不具合報告や機能要望をお寄せください。",
      openGraph: {
        description:
          "SHINJU DATEに関するお問い合わせフォームです。不具合報告や機能要望をお寄せください。",
        siteName: "SHINJU DATE",
        title: "お問い合わせ",
        type: "website",
        url: "/contact",
      },
      title: "お問い合わせ",
      twitter: {
        card: "summary_large_image",
        title: "お問い合わせ - SHINJU DATE",
      },
    });
  });

  it("feedback page", () => {
    expect(feedbackMetadata).toStrictEqual({
      alternates: {
        canonical: "/feedback",
      },
      description:
        "SHINJU DATEへの機能要望を送信できます。こんな機能があったらいいな、というアイデアをお寄せください。",
      openGraph: {
        description:
          "SHINJU DATEへの機能要望を送信できます。こんな機能があったらいいな、というアイデアをお寄せください。",
        siteName: "SHINJU DATE",
        title: "機能要望",
        type: "website",
        url: "/feedback",
      },
      title: "機能要望",
      twitter: {
        card: "summary_large_image",
        title: "機能要望 - SHINJU DATE",
      },
    });
  });

  it("list of videos without the image of the parent segment", async () => {
    const metadata = await generateVideosPageMetadata(undefined, {}, null);

    expect(metadata.openGraph).not.toHaveProperty("images");
  });
});

/**
 * The images in `opengraph-image.tsx` of the pages show the titles, which are
 * also their `alt`.
 */
describe("Open Graph images of the pages", () => {
  it.each<[string, string, Metadata]>([
    ["about", aboutImageAlt, aboutMetadata],
    ["contact", contactImageAlt, contactMetadata],
    ["feedback", feedbackImageAlt, feedbackMetadata],
    ["privacy policy", privacyImageAlt, privacyMetadata],
    ["schedule", scheduleImageAlt, scheduleMetadata],
    ["list of talents", talentsImageAlt, talentsMetadata],
    ["terms of use", termsImageAlt, termsMetadata],
  ])("the image of the %s page has its title", (_, alt, metadata) => {
    expect(alt).toBe(metadata.openGraph?.title);
  });

  it("the image of the list of videos has its title", async () => {
    const metadata = await generateVideosPageMetadata(undefined);

    expect(videosImageAlt).toBe(metadata.openGraph?.title);
  });
});
