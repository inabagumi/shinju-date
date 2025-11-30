-- talents
INSERT INTO public.talents (id, name, created_at, updated_at, theme_color)
VALUES
	('00000000-0000-0000-0000-000000000001', 'Alice', NOW(), NOW(), '#FF0000'),
	('00000000-0000-0000-0000-000000000002', 'Bob', NOW(), NOW(), '#00FF00'),
	('00000000-0000-0000-0000-000000000003', 'Carol', NOW(), NOW(), '#0000FF'),
	('00000000-0000-0000-0000-000000000004', 'Dave', NOW(), NOW(), '#FFFF00'),
	('00000000-0000-0000-0000-000000000005', 'Eve', NOW(), NOW(), '#00FFFF'),
	('00000000-0000-0000-0000-000000000006', 'Frank', NOW(), NOW(), '#FF00FF'),
	('00000000-0000-0000-0000-000000000007', 'Grace', NOW(), NOW(), '#C0C0C0'),
	('00000000-0000-0000-0000-000000000008', 'Heidi', NOW(), NOW(), '#FFA500'),
	('00000000-0000-0000-0000-000000000009', 'Ivan', NOW(), NOW(), '#008000'),
	('00000000-0000-0000-0000-000000000010', 'Judy', NOW(), NOW(), '#800080');

-- terms
INSERT INTO public.terms (id, term, synonyms, readings, created_at, updated_at)
VALUES
	('20000000-0000-0000-0000-000000000001', '配信', ARRAY['ライブ'], ARRAY['はいしん'], NOW(), NOW()),
	('20000000-0000-0000-0000-000000000002', '動画', ARRAY['ムービー'], ARRAY['どうが'], NOW(), NOW());

-- videos (including published, upcoming, and live videos)
INSERT INTO public.videos (id, title, duration, created_at, updated_at, published_at, visible, thumbnail_id, talent_id, platform, status)
VALUES
	-- Upcoming videos (future published_at)
	('30000000-0000-0000-0000-000000000011', '【予定】明日の配信', 'PT2H0M0S', date_trunc('second', NOW() - INTERVAL '1 hour'), date_trunc('second', NOW() - INTERVAL '30 minutes'), date_trunc('second', NOW() + INTERVAL '1 day'), TRUE, NULL, '00000000-0000-0000-0000-000000000001', 'youtube', 'UPCOMING'),
	('30000000-0000-0000-0000-000000000012', '【予定】明後日のゲーム配信', 'PT3H0M0S', date_trunc('second', NOW() - INTERVAL '2 hours'), date_trunc('second', NOW() - INTERVAL '1 hour'), date_trunc('second', NOW() + INTERVAL '2 days'), TRUE, NULL, '00000000-0000-0000-0000-000000000002', 'youtube', 'UPCOMING'),
	('30000000-0000-0000-0000-000000000013', '【予定】週末の雑談配信', 'PT1H30M0S', date_trunc('second', NOW() - INTERVAL '3 hours'), date_trunc('second', NOW() - INTERVAL '2 hours'), date_trunc('second', NOW() + INTERVAL '3 days'), TRUE, NULL, '00000000-0000-0000-0000-000000000003', 'youtube', 'UPCOMING'),
	('30000000-0000-0000-0000-000000000014', '【予定】歌枠', 'PT2H30M0S', date_trunc('second', NOW() - INTERVAL '4 hours'), date_trunc('second', NOW() - INTERVAL '3 hours'), date_trunc('second', NOW() + INTERVAL '4 days'), TRUE, NULL, '00000000-0000-0000-0000-000000000004', 'youtube', 'UPCOMING'),
	('30000000-0000-0000-0000-000000000015', '【予定】コラボ配信', 'PT2H0M0S', date_trunc('second', NOW() - INTERVAL '5 hours'), date_trunc('second', NOW() - INTERVAL '4 hours'), date_trunc('second', NOW() + INTERVAL '5 days'), TRUE, NULL, '00000000-0000-0000-0000-000000000005', 'youtube', 'UPCOMING'),
	-- Live videos (current time)
	('30000000-0000-0000-0000-000000000021', '【LIVE】現在配信中！', 'PT0H0M0S', date_trunc('second', NOW() - INTERVAL '2 hours'), date_trunc('second', NOW() - INTERVAL '1 hour'), date_trunc('second', NOW() - INTERVAL '30 minutes'), TRUE, NULL, '00000000-0000-0000-0000-000000000006', 'youtube', 'LIVE'),
	('30000000-0000-0000-0000-000000000022', '【LIVE】ゲーム配信中', 'PT0H0M0S', date_trunc('second', NOW() - INTERVAL '3 hours'), date_trunc('second', NOW() - INTERVAL '2 hours'), date_trunc('second', NOW() - INTERVAL '1 hour'), TRUE, NULL, '00000000-0000-0000-0000-000000000007', 'youtube', 'LIVE'),
	-- Published videos (past)
	('30000000-0000-0000-0000-000000000001', 'テスト動画100', 'PT1H2M10S', date_trunc('second', NOW() - INTERVAL '0 days' - INTERVAL '1 hour'), date_trunc('second', NOW() - INTERVAL '0 days' - INTERVAL '30 minutes'), date_trunc('second', NOW()), TRUE, NULL, '00000000-0000-0000-0000-000000000001', 'youtube', 'PUBLISHED'),
	('30000000-0000-0000-0000-000000000002', 'テスト動画99', 'PT2H3M5S', date_trunc('second', NOW() - INTERVAL '1 days' - INTERVAL '2 hour'), date_trunc('second', NOW() - INTERVAL '1 days' - INTERVAL '1 hour'), date_trunc('second', NOW() - INTERVAL '1 days'), TRUE, NULL, '00000000-0000-0000-0000-000000000002', 'youtube', 'PUBLISHED'),
	('30000000-0000-0000-0000-000000000003', 'テスト動画98', 'PT45M12S', date_trunc('second', NOW() - INTERVAL '2 days' - INTERVAL '3 hour'), date_trunc('second', NOW() - INTERVAL '2 days' - INTERVAL '2 hour'), date_trunc('second', NOW() - INTERVAL '2 days'), TRUE, NULL, '00000000-0000-0000-0000-000000000003', 'youtube', 'PUBLISHED'),
	('30000000-0000-0000-0000-000000000004', 'テスト動画97', 'PT1H5M30S', date_trunc('second', NOW() - INTERVAL '3 days' - INTERVAL '4 hour'), date_trunc('second', NOW() - INTERVAL '3 days' - INTERVAL '3 hour'), date_trunc('second', NOW() - INTERVAL '3 days'), TRUE, NULL, '00000000-0000-0000-0000-000000000004', 'youtube', 'PUBLISHED'),
	('30000000-0000-0000-0000-000000000005', 'テスト動画96', 'PT2H15M0S', date_trunc('second', NOW() - INTERVAL '4 days' - INTERVAL '5 hour'), date_trunc('second', NOW() - INTERVAL '4 days' - INTERVAL '4 hour'), date_trunc('second', NOW() - INTERVAL '4 days'), TRUE, NULL, '00000000-0000-0000-0000-000000000005', 'youtube', 'PUBLISHED'),
	('30000000-0000-0000-0000-000000001000', 'テスト動画1', 'PT1H10M5S', date_trunc('second', NOW() - INTERVAL '99 days' - INTERVAL '10 hour'), date_trunc('second', NOW() - INTERVAL '99 days' - INTERVAL '9 hour'), date_trunc('second', NOW() - INTERVAL '99 days'), TRUE, NULL, '00000000-0000-0000-0000-000000000010', 'youtube', 'PUBLISHED');

-- youtube_channels
INSERT INTO public.youtube_channels (id, talent_id, youtube_channel_id, youtube_handle, name)
VALUES
	('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'UC00000001', '@alice', 'Alice Channel'),
	('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'UC00000002', '@bob', 'Bob Channel'),
	('11000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'UC00000003', '@carol', 'Carol Channel'),
	('11000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'UC00000004', '@dave', 'Dave Channel'),
	('11000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'UC00000005', '@eve', 'Eve Channel'),
	('11000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', 'UC00000006', '@frank', 'Frank Channel'),
	('11000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000007', 'UC00000007', '@grace', 'Grace Channel'),
	('11000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000008', 'UC00000008', '@heidi', 'Heidi Channel'),
	('11000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000009', 'UC00000009', '@ivan', 'Ivan Channel'),
	('11000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'UC00000010', '@judy', 'Judy Channel');

-- youtube_videos (including entries for upcoming and live videos)
INSERT INTO public.youtube_videos (id, video_id, youtube_video_id, youtube_channel_id)
VALUES
	-- Upcoming videos
	('12000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011', 'ytvid-upcoming1', '11000000-0000-0000-0000-000000000001'),
	('12000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000012', 'ytvid-upcoming2', '11000000-0000-0000-0000-000000000002'),
	('12000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000013', 'ytvid-upcoming3', '11000000-0000-0000-0000-000000000003'),
	('12000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000014', 'ytvid-upcoming4', '11000000-0000-0000-0000-000000000004'),
	('12000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000015', 'ytvid-upcoming5', '11000000-0000-0000-0000-000000000005'),
	-- Live videos
	('12000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000021', 'ytvid-live1', '11000000-0000-0000-0000-000000000006'),
	('12000000-0000-0000-0000-000000000022', '30000000-0000-0000-0000-000000000022', 'ytvid-live2', '11000000-0000-0000-0000-000000000007'),
	-- Published videos
	('12000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'ytvid100', '11000000-0000-0000-0000-000000000001'),
	('12000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'ytvid99', '11000000-0000-0000-0000-000000000002'),
	('12000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'ytvid98', '11000000-0000-0000-0000-000000000003'),
	('12000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 'ytvid97', '11000000-0000-0000-0000-000000000004'),
	('12000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', 'ytvid96', '11000000-0000-0000-0000-000000000005'),
	('12000000-0000-0000-0000-000000001000', '30000000-0000-0000-0000-000000001000', 'ytvid1', '11000000-0000-0000-0000-000000000010');

-- announcements
INSERT INTO public.announcements (id, enabled, level, message, start_at, end_at, created_at, updated_at)
VALUES
	('40000000-0000-0000-0000-000000000001', TRUE, 'info', '新機能リリース', NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 day', NOW(), NOW());
