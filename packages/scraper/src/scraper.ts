import type { Enums } from "@shinju-date/database";

import type { Logger } from "./internal/logger.js";
import { removeUnusedProfileImages } from "./internal/profile-images/index.js";
import {
  removeUnusedThumbnails,
  UNUSED_THUMBNAIL_GRACE_PERIOD,
} from "./internal/thumbnails/index.js";
import type {
  AddPastVideosOptions,
  AddPastVideosResult,
  CrawlContext,
  ErrorReporter,
  RefreshVideoResult,
  ScraperOptions,
  SyncAccountResult,
  TypedSupabaseClient,
} from "./types.js";

const silentLogger: Logger = {
  debug() {},
  error() {},
  info() {},
  warn() {},
};

/**
 * Keeps the videos and accounts of one platform in the database in sync with
 * that platform.
 *
 * Every platform offers the same operations, so callers (the cron routes)
 * never need to know which platform they are driving:
 *
 * | Operation                 | What it does                                    |
 * | ------------------------- | ----------------------------------------------- |
 * | `addNewVideos`            | saves videos that appeared on tracked accounts  |
 * | `addPastVideos`           | saves one page of an account's whole history    |
 * | `cleanUpImages`           | deletes thumbnails and icons nothing uses       |
 * | `refreshLiveVideos`       | follows videos that are scheduled or on air     |
 * | `refreshRecentVideos`     | re-reads the newest finished videos             |
 * | `refreshVideo`            | re-reads one saved video                        |
 * | `removeUnavailableVideos` | soft-deletes videos that are gone, across all   |
 * | `syncAccounts`            | updates names, handles and icons of accounts    |
 * | `syncTalentAccounts`      | does the same for the accounts of one talent    |
 *
 * How a platform is read and how its videos are stored (its own link table,
 * its own notion of a broadcast) is entirely up to the subclass.
 *
 * ## Guarantees
 *
 * - A failure that concerns one account or one video does not stop the run: it
 *   is passed to `onError` and the rest is processed.
 * - An operation rejects only when the run as a whole cannot proceed (the
 *   platform or the database is unreachable). Nothing is deleted in that case.
 * - Each operation resolves to whether it changed anything the public site
 *   shows, so callers know when to refresh caches. `cleanUpImages` only
 *   deletes what the site no longer shows, so it resolves to nothing.
 */
export abstract class Scraper {
  /** Name of the platform, as stored in `videos.platform`. */
  abstract readonly provider: Enums<"platform_type">;

  protected readonly logger: Logger;
  protected readonly supabaseClient: TypedSupabaseClient;
  readonly #onError: ErrorReporter | undefined;

  constructor({ logger, onError, supabaseClient }: ScraperOptions) {
    this.logger = logger ?? silentLogger;
    this.#onError = onError;
    this.supabaseClient = supabaseClient;
  }

  /**
   * Saves videos that appeared on the accounts of active talents.
   * Videos that are already saved are left alone.
   */
  abstract addNewVideos(now?: Temporal.Instant): Promise<boolean>;

  /**
   * Reads one page of an account's whole history, newest first, and saves
   * the videos that are not saved yet (a backfill). Videos that are saved
   * already are left alone.
   *
   * A history is read across several calls so that none of them runs long:
   * pass the returned cursor to the next call until it is `null`.
   *
   * Unlike the other operations this concerns a single account, so a failure
   * to read it rejects; a video that cannot be saved is still only reported.
   *
   * @throws {AccountNotFoundError} When the account does not exist or its
   *   talent was deleted.
   * @throws {StalledPaginationError} When the platform returns the requested
   *   cursor as the next one.
   */
  abstract addPastVideos(
    options: AddPastVideosOptions
  ): Promise<AddPastVideosResult>;

  /**
   * Follows the videos that change from minute to minute: scheduled ones and
   * those on air. Starts, title changes and endings are picked up here.
   */
  abstract refreshLiveVideos(now?: Temporal.Instant): Promise<boolean>;

  /**
   * Re-reads the newest finished videos of active talents: updates what
   * changed and soft-deletes the ones the platform no longer returns.
   */
  abstract refreshRecentVideos(now?: Temporal.Instant): Promise<boolean>;

  /**
   * Re-reads one saved video and brings it in line with the platform, with
   * the same functions as the scheduled refreshes: the same columns are
   * updated to the same values, and a video the platform no longer returns
   * is soft-deleted with the same reason (`unavailable`).
   *
   * Unlike the scheduled refreshes, this concerns a single video, so a
   * failure to read the platform or the database rejects (a thumbnail that
   * cannot be stored is still only reported).
   *
   * @param videoId Primary key of the `videos` row.
   */
  abstract refreshVideo(
    videoId: string,
    now?: Temporal.Instant
  ): Promise<RefreshVideoResult>;

  /**
   * Checks every saved video of non-deleted talents and soft-deletes the ones
   * the platform no longer returns. Details are not refreshed.
   */
  abstract removeUnavailableVideos(now?: Temporal.Instant): Promise<boolean>;

  /**
   * Brings names and handles (and, where supported, icons) of the saved
   * accounts in line with the platform.
   */
  abstract syncAccounts(now?: Temporal.Instant): Promise<boolean>;

  /**
   * Brings names and handles (and, where supported, icons) of the accounts of
   * one talent in line with the platform, with the same functions as
   * `syncAccounts`: an account is written only when something changed.
   *
   * Unlike `syncAccounts`, this concerns a single talent, so a failure to read
   * the platform or the database rejects; an account that cannot be updated is
   * still only reported, and returned as `failed`.
   *
   * @param talentId Primary key of the `talents` row.
   * @returns One result per saved account of the talent on this platform;
   *   empty when the talent has none or was deleted.
   */
  abstract syncTalentAccounts(
    talentId: string,
    now?: Temporal.Instant
  ): Promise<SyncAccountResult[]>;

  /**
   * Deletes thumbnails no video uses and icons no account uses, once they
   * have been unused for their grace period (a week for thumbnails, an hour
   * for icons).
   *
   * Thumbnails and icons are shared by every platform, so this cleans up
   * those of all platforms, whichever scraper it is called on.
   *
   * Unused images are never shown, so a failure is only reported, and a
   * failure to clean up one kind does not keep the other from being cleaned
   * up. This never rejects.
   */
  async cleanUpImages(
    now: Temporal.Instant = Temporal.Now.instant()
  ): Promise<void> {
    await this.#cleanUp("removeUnusedThumbnails", () =>
      removeUnusedThumbnails(this.supabaseClient, {
        now,
        olderThan: UNUSED_THUMBNAIL_GRACE_PERIOD,
      })
    );
    await this.#cleanUp("removeUnusedProfileImages", () =>
      removeUnusedProfileImages(this.supabaseClient, { now })
    );
  }

  async #cleanUp(
    operation: "removeUnusedProfileImages" | "removeUnusedThumbnails",
    remove: () => Promise<number>
  ): Promise<void> {
    try {
      const removedCount = await remove();

      if (removedCount > 0) {
        this.logger.info("使われていない画像を削除しました", {
          operation,
          removedCount,
        });
      }
    } catch (error) {
      this.reportError(error, { operation });
    }
  }

  /**
   * Reports a failure that does not stop the run.
   */
  protected reportError: ErrorReporter = (error, context) => {
    if (this.#onError) {
      this.#onError(error, context);
      return;
    }

    this.logger.error("Failed to process an item", {
      ...context,
      error,
      provider: this.provider,
    });
  };

  /**
   * Bundles what a crawl operation needs for one run.
   */
  protected createContext<TFetcher>(
    fetcher: TFetcher,
    now: Temporal.Instant = Temporal.Now.instant()
  ): CrawlContext<TFetcher> {
    return {
      fetcher,
      logger: this.logger,
      now,
      reportError: this.reportError,
      supabaseClient: this.supabaseClient,
    };
  }
}
