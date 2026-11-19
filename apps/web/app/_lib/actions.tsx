"use server";

import { logger } from "@shinju-date/logger";
import { cookies } from "next/headers";

import { selectCurrentAnnouncement } from "@/lib/announcement";
import { fetchActiveAnnouncements } from "@/lib/data/announcements";
import type { Announcement } from "@/lib/data/announcements";
import { fetchActiveTalents } from "@/lib/data/talents";
import type { Talent } from "@/lib/data/talents";
import { getDisplayRecommendationQueries } from "@/lib/recommendations/get-display-queries";
import { COOKIE_NAMES } from "@/lib/site";
import { supabaseClient } from "@/lib/supabase";

import { renderAnnouncement } from "../_components/announcement-message";
import type { RenderedAnnouncement } from "../_components/announcement-message";

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

/**
 * Get the currently active announcement
 * When the periods of some announcements overlap, the newest one is returned.
 * Returns null if no announcement is active
 */
export const getAnnouncement = async (): Promise<Announcement | null> => {
  try {
    const announcements = await fetchActiveAnnouncements();

    return selectCurrentAnnouncement(announcements, Temporal.Now.instant());
  } catch (error) {
    logger.error("Failed to fetch announcement", { error });

    return null;
  }
};

/**
 * Get the currently active announcement with its message rendered on the
 * server, so that the banner can refresh it without the Markdown parser
 * being shipped to the browser.
 * Returns null if no announcement is active
 */
export const getRenderedAnnouncement =
  async (): Promise<RenderedAnnouncement | null> => {
    const announcement = await getAnnouncement();

    return announcement ? renderAnnouncement(announcement) : null;
  };

/**
 * Server action to dismiss an announcement by saving its ID to a cookie
 * This prevents the announcement from being shown again until the cookie expires
 */
export const dismissAnnouncement = async (announcementId: string) => {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAMES.DISMISSED_ANNOUNCEMENT_ID, announcementId, {
    httpOnly: true,
    maxAge: ONE_DAY_IN_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
};

export interface Suggestion {
  term: string;
}

/**
 * Fetch search suggestions based on a query
 * Returns an array of suggested search terms
 */
export const fetchSuggestions = async (
  query: string
): Promise<Suggestion[]> => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabaseClient.rpc("suggestions_v2", {
      p_query: query.trim(),
    });

    if (error) {
      logger.error("Failed to fetch suggestions", { error, query });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error("Failed to fetch suggestions", { error, query });
    return [];
  }
};

/**
 * Fetch recommended queries for display
 * Returns an array of recommended search query strings
 */
export const fetchRecommendedQueries = async (): Promise<string[]> => {
  try {
    return await getDisplayRecommendationQueries();
  } catch (error) {
    logger.error("Failed to fetch recommended queries", { error });
    return [];
  }
};

/**
 * Fetch the active talents (ID and name) for the search modal.
 * The modal matches them against the input in the browser.
 */
export const fetchSearchModalTalents = async (): Promise<Talent[]> => {
  try {
    return await fetchActiveTalents();
  } catch (error) {
    logger.error("Failed to fetch talents", { error });
    return [];
  }
};
