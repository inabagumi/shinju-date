-- Tests for the storage buckets created by migrations (#7133, #7147). Run
-- with `supabase test db`.
BEGIN;

SELECT plan(4);

SELECT is(
    (SELECT "public" FROM "storage"."buckets" WHERE "id" = 'profile-images'),
    false,
    'profile-images bucket exists and is private'
);

SELECT is(
    (SELECT "public" FROM "storage"."buckets" WHERE "id" = 'thumbnails'),
    false,
    'thumbnails bucket exists and is private'
);

SELECT is(
    (SELECT "file_size_limit" FROM "storage"."buckets" WHERE "id" = 'thumbnails'),
    1048576::bigint,
    'thumbnails bucket limits objects to 1 MiB'
);

SELECT is(
    (SELECT "allowed_mime_types" FROM "storage"."buckets" WHERE "id" = 'thumbnails'),
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[],
    'thumbnails bucket only allows JPEG, PNG and WebP'
);

SELECT * FROM finish();

ROLLBACK;
