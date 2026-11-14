-- Profile images (icons) for YouTube channels and Twitch users (#6525)
--
-- Icons are copied into our own storage instead of linking to the platform
-- URLs, which change and expire. They get their own table rather than reusing
-- `thumbnails` because their lifecycle differs: a channel or user owns at most
-- one icon, an icon is always square, and a replaced icon is deleted for good
-- instead of being soft-deleted together with a video.
--
--   1. profile_images table (square images in the `profile-images` bucket)
--   2. youtube_channels.profile_image_id / twitch_users.profile_image_id
--   3. RLS: the public can only read icons that are in use
--   4. private `profile-images` storage bucket

-- ---------------------------------------------------------------------------
-- 1. profile_images
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."profile_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "path" "text" NOT NULL,
    "width" integer NOT NULL,
    "height" integer NOT NULL,
    "blur_data_url" "text" NOT NULL,
    "etag" "text",
    "source_url" "text" NOT NULL,
    CONSTRAINT "profile_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profile_images_path_key" UNIQUE ("path"),
    -- Icons are usually shown as circles, so only square images are accepted.
    CONSTRAINT "profile_images_square_check" CHECK ("width" > 0 AND "width" = "height")
);

ALTER TABLE "public"."profile_images" OWNER TO "postgres";

COMMENT ON TABLE "public"."profile_images" IS
    'Profile images (icons) of YouTube channels and Twitch users, stored in the profile-images bucket.';

COMMENT ON COLUMN "public"."profile_images"."path" IS
    'Object path in the profile-images bucket: {platform}/{platform account ID}/{random}.webp. Every upload gets a new path.';

COMMENT ON COLUMN "public"."profile_images"."etag" IS
    'ETag of the image on the source platform. While source_url is unchanged, it is sent as If-None-Match so an unchanged icon is not downloaded or uploaded again.';

COMMENT ON COLUMN "public"."profile_images"."source_url" IS
    'URL the image was copied from. Only used to detect changes together with etag; clients are always served the stored copy.';

CREATE OR REPLACE TRIGGER "on_profile_images_update"
    BEFORE UPDATE ON "public"."profile_images"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

-- ---------------------------------------------------------------------------
-- 2. References from youtube_channels / twitch_users (0 or 1 icon each)
--    RESTRICT: an icon that is still in use can never be deleted, so
--    clean-up code may safely try to delete any icon it believes is unused.
--    UNIQUE: an icon belongs to a single channel or user.
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."youtube_channels"
    ADD COLUMN "profile_image_id" "uuid";

ALTER TABLE ONLY "public"."youtube_channels"
    ADD CONSTRAINT "youtube_channels_profile_image_id_fkey"
    FOREIGN KEY ("profile_image_id") REFERENCES "public"."profile_images"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."youtube_channels"
    ADD CONSTRAINT "youtube_channels_profile_image_id_key" UNIQUE ("profile_image_id");

COMMENT ON COLUMN "public"."youtube_channels"."profile_image_id" IS
    'Channel icon. NULL when it has not been stored yet or YouTube has none; show the default icon then.';

ALTER TABLE "public"."twitch_users"
    ADD COLUMN "profile_image_id" "uuid";

ALTER TABLE ONLY "public"."twitch_users"
    ADD CONSTRAINT "twitch_users_profile_image_id_fkey"
    FOREIGN KEY ("profile_image_id") REFERENCES "public"."profile_images"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."twitch_users"
    ADD CONSTRAINT "twitch_users_profile_image_id_key" UNIQUE ("profile_image_id");

COMMENT ON COLUMN "public"."twitch_users"."profile_image_id" IS
    'User icon (Helix users.profile_image_url). NULL when it has not been stored yet; show the default icon then.';

-- ---------------------------------------------------------------------------
-- 3. RLS
--    Only the service role (batch) writes icons. The public may read an icon
--    while a channel or user of a talent that is not deleted uses it; admins
--    may read every icon, including unused ones awaiting clean-up.
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."profile_images" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profile images in use"
    ON "public"."profile_images"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM "public"."youtube_channels" AS "c"
            JOIN "public"."talents" AS "t" ON "t"."id" = "c"."talent_id"
            WHERE "c"."profile_image_id" = "profile_images"."id"
              AND "t"."deleted_at" IS NULL
        )
        OR EXISTS (
            SELECT 1
            FROM "public"."twitch_users" AS "u"
            JOIN "public"."talents" AS "t" ON "t"."id" = "u"."talent_id"
            WHERE "u"."profile_image_id" = "profile_images"."id"
              AND "t"."deleted_at" IS NULL
        )
    );

CREATE POLICY "Enable read access with unused profile images for authenticated"
    ON "public"."profile_images"
    FOR SELECT
    TO "authenticated"
    USING (true);

REVOKE ALL ON TABLE "public"."profile_images" FROM "anon";
REVOKE ALL ON TABLE "public"."profile_images" FROM "authenticated";
GRANT SELECT ON TABLE "public"."profile_images" TO "anon";
GRANT SELECT ON TABLE "public"."profile_images" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_images" TO "service_role";

-- ---------------------------------------------------------------------------
-- 4. Storage bucket
--    Private: objects are served through the web app's /images/profile-images
--    route, which only signs URLs for icons visible under the RLS above.
--    No storage.objects policies are added, so only the service role can
--    read or write objects. Icons are re-encoded to WebP before upload.
-- ---------------------------------------------------------------------------
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES ('profile-images', 'profile-images', false, 1048576, ARRAY['image/webp'])
ON CONFLICT ("id") DO NOTHING;
