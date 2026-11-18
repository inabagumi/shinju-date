"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Megaphone, Minus, TriangleAlert, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { queryKeys } from "@/lib/query-keys";

import { dismissAnnouncement, getRenderedAnnouncement } from "../_lib/actions";
import type { RenderedAnnouncement } from "./announcement-message";

interface BannerTone {
  /** 左端の線の色 */
  borderClassName: string;
  icon: LucideIcon;
  label: string;
  /** 見出しの文字とアイコンの色 */
  textClassName: string;
}

/**
 * お知らせの種類ごとの見た目。地はどれも `bg-surface` にそろえ、種類は
 * 左端の線と見出しの色（情報は `accent`、注意は `warning`、警告は `danger`）で示す。
 */
function getBannerTone(level: string): BannerTone {
  switch (level) {
    case "warning": {
      return {
        borderClassName: "border-l-warning",
        icon: TriangleAlert,
        label: "注意",
        textClassName: "text-warning",
      };
    }
    case "alert": {
      return {
        borderClassName: "border-l-danger",
        icon: CircleAlert,
        label: "警告",
        textClassName: "text-danger",
      };
    }
    default: {
      return {
        borderClassName: "border-l-accent",
        icon: Megaphone,
        label: "お知らせ",
        textClassName: "text-accent",
      };
    }
  }
}

const ICON_BUTTON_CLASS_NAME =
  "cursor-pointer rounded-control p-1 text-muted hover:bg-muted hover:text-foreground focus-ring";

/**
 * Site-wide announcement banner that sticks to the bottom of the viewport.
 *
 * Besides dismissing the announcement for good, the banner can be minimized
 * into a small pill so that it stops covering the content underneath without
 * hiding the announcement entirely. The message is collapsed to a single line
 * by default and can be expanded by clicking it.
 *
 * The message is rendered on the server (see `announcement-message.tsx`), so
 * this component never receives the Markdown source.
 */
export function AnnouncementBanner({
  announcement: initialAnnouncement,
}: {
  announcement: RenderedAnnouncement;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const minimizeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  const hasToggledMinimizedRef = useRef(false);

  // Periodically refetch announcement data
  const { data } = useQuery({
    enabled: isVisible,
    initialData: initialAnnouncement,
    queryFn: async () => {
      const announcement = await getRenderedAnnouncement();
      if (!announcement) {
        // If no announcement is available, hide the banner
        setIsVisible(false);
        return null;
      }
      return announcement;
    },
    queryKey: queryKeys.announcement(),
    refetchInterval: 1000 * 60, // Refetch every 60 seconds
    refetchIntervalInBackground: true,
    // The message is a React element rendered on the server, not JSON data.
    // Structural sharing would walk the whole element tree (including the
    // owner info React attaches in development) and copy the changed parts
    // into new objects for no benefit, so keep the fetched data as it is.
    structuralSharing: false,
  });

  // Keep keyboard focus on the control that replaced the one just used
  useEffect(() => {
    if (!hasToggledMinimizedRef.current) {
      return;
    }

    if (isMinimized) {
      restoreButtonRef.current?.focus();
    } else {
      minimizeButtonRef.current?.focus();
    }
  }, [isMinimized]);

  if (!isVisible || !data) {
    return null;
  }

  const tone = getBannerTone(data.level);
  const ToneIcon = tone.icon;

  // The sticky wrapper spans the full width of the page, so pointer events are
  // disabled on it and re-enabled only on the visible banner / pill. Otherwise
  // the transparent area next to them would block clicks on the content.

  const toggleMinimized = () => {
    hasToggledMinimizedRef.current = true;
    setIsMinimized((value) => !value);
  };

  if (isMinimized) {
    return (
      <div className="pointer-events-none sticky bottom-4 z-50 safe-area-mx">
        <div className="mb-4 flex justify-end">
          <button
            aria-expanded={false}
            aria-label="お知らせを表示"
            className="pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-meta font-semibold text-foreground shadow-overlay focus-ring hover:bg-muted"
            data-testid="announcement-banner-minimized"
            onClick={toggleMinimized}
            ref={restoreButtonRef}
            type="button"
          >
            <ToneIcon
              aria-hidden="true"
              className={`size-4 ${tone.textClassName}`}
            />
            お知らせ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none sticky bottom-4 z-50 safe-area-mx">
      <div
        className={`pointer-events-auto mb-4 ml-auto max-w-md rounded-container border border-l-4 border-border bg-surface p-4 text-foreground shadow-overlay ${tone.borderClassName}`}
        data-testid="announcement-banner"
        role="alert"
      >
        <div className="flex items-start justify-between gap-3">
          {/*
           * 見出しは本文と同じ行に置く。行を分けると、モバイルで動画一覧の
           * カード（高さ約 80px）よりバナーが高くなり、隠す範囲が広がるため
           */}
          <div className="flex min-w-0 flex-1 items-start gap-2 py-0.5">
            <p
              className={`flex shrink-0 items-center gap-1.5 text-meta font-semibold ${tone.textClassName}`}
            >
              <ToneIcon aria-hidden="true" className="size-4" />
              {tone.label}
            </p>
            <button
              aria-expanded={isExpanded}
              className="min-w-0 flex-1 cursor-pointer rounded-control text-left focus-ring"
              onClick={() => setIsExpanded(!isExpanded)}
              type="button"
            >
              <div
                className={`prose prose-sm max-w-none prose-tokens ${
                  isExpanded ? "" : "line-clamp-1"
                }`}
              >
                {data.message}
              </div>
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label="お知らせを縮小"
              className={ICON_BUTTON_CLASS_NAME}
              onClick={toggleMinimized}
              ref={minimizeButtonRef}
              type="button"
            >
              <Minus aria-hidden="true" className="size-5" />
            </button>
            <button
              aria-label="お知らせを閉じる"
              className={ICON_BUTTON_CLASS_NAME}
              onClick={async () => {
                await dismissAnnouncement(data.id);
                setIsVisible(false);
              }}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
