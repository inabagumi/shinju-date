-- Tests for the profile_images table (run with `pnpm exec supabase test db`).
BEGIN;

SELECT plan(19);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
INSERT INTO public.talents (id, name)
VALUES
	('f0000000-0000-0000-0000-000000000001', 'Active talent'),
	('f0000000-0000-0000-0000-000000000002', 'Deleted talent');

UPDATE public.talents
SET deleted_at = NOW()
WHERE id = 'f0000000-0000-0000-0000-000000000002';

INSERT INTO public.youtube_channels (id, talent_id, youtube_channel_id)
VALUES
	('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'UC_test_active'),
	('f1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'UC_test_deleted'),
	('f1000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 'UC_test_extra');

INSERT INTO public.twitch_users (id, talent_id, twitch_user_id)
VALUES
	('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'test_active');

INSERT INTO public.profile_images (id, youtube_channel_id, twitch_user_id, path, width, height, blur_data_url)
VALUES
	('f3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', NULL, 'youtube/UC_test_active/a.webp', 256, 256, 'data:,'),
	('f3000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', NULL, 'youtube/UC_test_deleted/a.webp', 256, 256, 'data:,'),
	('f3000000-0000-0000-0000-000000000003', NULL, 'f2000000-0000-0000-0000-000000000001', 'twitch/test_active/a.webp', 256, 256, 'data:,');

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
SELECT has_table('public', 'profile_images', 'profile_images exists');
SELECT col_is_null('public', 'profile_images', 'etag', 'etag is optional');
SELECT col_not_null('public', 'profile_images', 'blur_data_url', 'blur_data_url is required');

-- ---------------------------------------------------------------------------
-- Ownership constraints: 0 or 1 image per account, exactly one owner
-- ---------------------------------------------------------------------------
SELECT throws_ok(
	$$INSERT INTO public.profile_images (youtube_channel_id, path, width, height, blur_data_url)
	  VALUES ('f1000000-0000-0000-0000-000000000001', 'youtube/UC_test_active/b.webp', 256, 256, 'data:,')$$,
	'23505',
	NULL,
	'a YouTube channel cannot have two profile images'
);

SELECT throws_ok(
	$$INSERT INTO public.profile_images (twitch_user_id, path, width, height, blur_data_url)
	  VALUES ('f2000000-0000-0000-0000-000000000001', 'twitch/test_active/b.webp', 256, 256, 'data:,')$$,
	'23505',
	NULL,
	'a Twitch user cannot have two profile images'
);

SELECT throws_ok(
	$$INSERT INTO public.profile_images (path, width, height, blur_data_url)
	  VALUES ('orphan.webp', 256, 256, 'data:,')$$,
	'23514',
	NULL,
	'an image must have an owner'
);

SELECT throws_ok(
	$$INSERT INTO public.profile_images (youtube_channel_id, twitch_user_id, path, width, height, blur_data_url)
	  VALUES ('f1000000-0000-0000-0000-000000000003', 'f2000000-0000-0000-0000-000000000001', 'shared.webp', 256, 256, 'data:,')$$,
	'23514',
	NULL,
	'an image cannot belong to two accounts'
);

SELECT throws_ok(
	$$INSERT INTO public.profile_images (youtube_channel_id, path, width, height, blur_data_url)
	  VALUES ('f1000000-0000-0000-0000-000000000003', 'youtube/UC_test_extra/a.webp', 320, 180, 'data:,')$$,
	'23514',
	NULL,
	'images must be square'
);

SELECT throws_ok(
	$$INSERT INTO public.profile_images (youtube_channel_id, path, width, height, blur_data_url)
	  VALUES ('f1000000-0000-0000-0000-000000000003', 'youtube/UC_test_active/a.webp', 256, 256, 'data:,')$$,
	'23505',
	NULL,
	'a stored object belongs to a single row'
);

-- ---------------------------------------------------------------------------
-- Lifecycle
-- ---------------------------------------------------------------------------
UPDATE public.profile_images
SET path = 'youtube/UC_test_active/b.webp', etag = '"v2"', updated_at = '2000-01-01T00:00:00Z'
WHERE id = 'f3000000-0000-0000-0000-000000000001';

SELECT is(
	(SELECT path FROM public.profile_images WHERE youtube_channel_id = 'f1000000-0000-0000-0000-000000000001'),
	'youtube/UC_test_active/b.webp',
	'replacing an image keeps the row referenced by its channel'
);

SELECT isnt(
	(SELECT updated_at FROM public.profile_images WHERE id = 'f3000000-0000-0000-0000-000000000001'),
	'2000-01-01T00:00:00Z'::timestamptz,
	'updated_at is maintained by the trigger'
);

DELETE FROM public.youtube_channels WHERE id = 'f1000000-0000-0000-0000-000000000001';

SELECT is_empty(
	$$SELECT 1 FROM public.profile_images WHERE id = 'f3000000-0000-0000-0000-000000000001'$$,
	'deleting a YouTube channel deletes its profile image row'
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
INSERT INTO public.profile_images (id, youtube_channel_id, path, width, height, blur_data_url)
VALUES ('f3000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000003', 'youtube/UC_test_extra/a.webp', 256, 256, 'data:,');

SET LOCAL ROLE anon;

SELECT results_eq(
	$$SELECT id FROM public.profile_images WHERE id::text LIKE 'f3%' ORDER BY id$$,
	$$VALUES ('f3000000-0000-0000-0000-000000000003'::uuid), ('f3000000-0000-0000-0000-000000000004'::uuid)$$,
	'anon reads only images of accounts whose talent is active'
);

SELECT throws_ok(
	$$INSERT INTO public.profile_images (youtube_channel_id, path, width, height, blur_data_url)
	  VALUES ('f1000000-0000-0000-0000-000000000003', 'anon.webp', 256, 256, 'data:,')$$,
	'42501',
	NULL,
	'anon cannot insert profile images'
);

SELECT throws_ok(
	$$UPDATE public.profile_images SET etag = 'x'$$,
	'42501',
	NULL,
	'anon cannot update profile images'
);

SELECT throws_ok(
	$$DELETE FROM public.profile_images$$,
	'42501',
	NULL,
	'anon cannot delete profile images'
);

RESET ROLE;

SET LOCAL ROLE authenticated;

SELECT results_eq(
	$$SELECT count(*)::int FROM public.profile_images WHERE id::text LIKE 'f3%'$$,
	$$VALUES (3)$$,
	'authenticated users read images of deleted talents too'
);

RESET ROLE;

-- Cascades from twitch_users as well.
DELETE FROM public.twitch_users WHERE id = 'f2000000-0000-0000-0000-000000000001';

SELECT is_empty(
	$$SELECT 1 FROM public.profile_images WHERE id = 'f3000000-0000-0000-0000-000000000003'$$,
	'deleting a Twitch user deletes its profile image row'
);

SELECT is(
	(SELECT public FROM storage.buckets WHERE id = 'profile-images'),
	false,
	'the profile-images bucket is private'
);

SELECT * FROM finish();

ROLLBACK;
