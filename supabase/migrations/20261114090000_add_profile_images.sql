-- Profile images (icons) for YouTube channels and Twitch users (#6525)
--
-- Design:
--   - A dedicated table instead of reusing `thumbnails`. Thumbnails belong to
--     videos and are soft-deleted with them; profile images belong to exactly
--     one platform account and are replaced in place, so their lifecycle and
--     read rules differ.
--   - Ownership lives on this table (`youtube_channel_id` / `twitch_user_id`)
--     with UNIQUE + ON DELETE CASCADE. That guarantees, in the database:
--       * each account has 0 or 1 profile image,
--       * an image belongs to exactly one account (never shared),
--       * deleting an account deletes its image row (no orphan rows).
--   - Replacing an icon updates the row in place (new `path`, `etag`, ...), so
--     references stay valid while the stored object is swapped.
--   - Images are always stored square (`width = height`) so they can be shown
--     in a circle without distortion.
--   - Binary data lives in the private `profile-images` Storage bucket and is
--     served through the web app, never by linking to the platform's URL.
--
-- Storage objects cannot be deleted from SQL, so the application removes the
-- stored object after replacing an image or deleting an account.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."profile_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "youtube_channel_id" "uuid",
    "twitch_user_id" "uuid",
    "path" "text" NOT NULL,
    "width" bigint NOT NULL,
    "height" bigint NOT NULL,
    "blur_data_url" "text" NOT NULL,
    "etag" "text",
    CONSTRAINT "profile_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profile_images_path_key" UNIQUE ("path"),
    CONSTRAINT "profile_images_youtube_channel_id_key" UNIQUE ("youtube_channel_id"),
    CONSTRAINT "profile_images_twitch_user_id_key" UNIQUE ("twitch_user_id"),
    CONSTRAINT "profile_images_youtube_channel_id_fkey"
        FOREIGN KEY ("youtube_channel_id") REFERENCES "public"."youtube_channels"("id") ON DELETE CASCADE,
    CONSTRAINT "profile_images_twitch_user_id_fkey"
        FOREIGN KEY ("twitch_user_id") REFERENCES "public"."twitch_users"("id") ON DELETE CASCADE,
    CONSTRAINT "profile_images_single_owner_check"
        CHECK ("num_nonnulls"("youtube_channel_id", "twitch_user_id") = 1),
    CONSTRAINT "profile_images_square_check"
        CHECK ("width" > 0 AND "width" = "height")
);

ALTER TABLE "public"."profile_images" OWNER TO "postgres";

COMMENT ON TABLE "public"."profile_images" IS
    'Profile images (icons) of platform accounts. Each row belongs to exactly one YouTube channel or Twitch user.';
COMMENT ON COLUMN "public"."profile_images"."path" IS
    'Object path in the profile-images Storage bucket ({platform}/{platform account id}/{random}.{ext}).';
COMMENT ON COLUMN "public"."profile_images"."etag" IS
    'ETag of the source image (or a digest when the source sends none). Used to skip re-uploading an unchanged icon.';

CREATE OR REPLACE TRIGGER "on_profile_images_update"
    BEFORE UPDATE ON "public"."profile_images"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

-- ---------------------------------------------------------------------------
-- 2. Row level security
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."profile_images" ENABLE ROW LEVEL SECURITY;

-- Public clients only see icons of accounts whose talent is not deleted.
CREATE POLICY "Allow public read access to active accounts"
    ON "public"."profile_images"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM "public"."youtube_channels" "c"
            JOIN "public"."talents" "t" ON "t"."id" = "c"."talent_id"
            WHERE "c"."id" = "profile_images"."youtube_channel_id"
              AND "t"."deleted_at" IS NULL
        )
        OR EXISTS (
            SELECT 1
            FROM "public"."twitch_users" "u"
            JOIN "public"."talents" "t" ON "t"."id" = "u"."talent_id"
            WHERE "u"."id" = "profile_images"."twitch_user_id"
              AND "t"."deleted_at" IS NULL
        )
    );

CREATE POLICY "Enable read access with deleted contents for authenticated"
    ON "public"."profile_images"
    FOR SELECT
    TO "authenticated"
    USING (true);

CREATE POLICY "Enable insert for authenticated users"
    ON "public"."profile_images"
    FOR INSERT
    TO "authenticated"
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
    ON "public"."profile_images"
    FOR UPDATE
    TO "authenticated"
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
    ON "public"."profile_images"
    FOR DELETE
    TO "authenticated"
    USING (true);

-- anon can only read; writes are reserved for admins and the batch.
REVOKE ALL ON TABLE "public"."profile_images" FROM "anon";
GRANT SELECT ON TABLE "public"."profile_images" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."profile_images" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_images" TO "service_role";

-- ---------------------------------------------------------------------------
-- 3. Storage bucket
--    Private: objects are only reachable through signed URLs created by the
--    server, after the row has passed the checks above.
-- ---------------------------------------------------------------------------
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES (
    'profile-images',
    'profile-images',
    false,
    1048576,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT ("id") DO NOTHING;
