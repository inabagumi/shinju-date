-- Tests for the storage buckets created by migrations (#7133). Run with
-- `supabase test db`.
BEGIN;

SELECT plan(2);

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

SELECT * FROM finish();

ROLLBACK;
