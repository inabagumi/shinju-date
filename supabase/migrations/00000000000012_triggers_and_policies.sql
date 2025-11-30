-- トリガー・ポリシー・権限・外部キー等の共通定義

-- handle_updated_at トリガー関数
CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW.updated_at = date_trunc('second', NOW());
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";

-- 各種トリガー
CREATE OR REPLACE TRIGGER "on_announcements_update" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "on_terms_update" BEFORE UPDATE ON "public"."terms" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "on_thumbnails_update" BEFORE UPDATE ON "public"."thumbnails" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "on_videos_update" BEFORE UPDATE ON "public"."videos" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

ALTER TABLE ONLY "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."twitch_users" ADD CONSTRAINT "twitch_users_talent_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id");
ALTER TABLE ONLY "public"."twitch_videos" ADD CONSTRAINT "twitch_videos_twitch_user_id_fkey" FOREIGN KEY ("twitch_user_id") REFERENCES "public"."twitch_users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."twitch_videos" ADD CONSTRAINT "twitch_videos_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."videos" ADD CONSTRAINT "videos_talent_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id");
ALTER TABLE ONLY "public"."videos" ADD CONSTRAINT "videos_thumbnail_id_fkey" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."thumbnails"("id");
ALTER TABLE ONLY "public"."youtube_channels" ADD CONSTRAINT "youtube_channels_talent_id_fkey" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id");
ALTER TABLE ONLY "public"."youtube_videos" ADD CONSTRAINT "youtube_videos_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."youtube_videos" ADD CONSTRAINT "youtube_videos_youtube_channel_id_fkey" FOREIGN KEY ("youtube_channel_id") REFERENCES "public"."youtube_channels"("id") ON DELETE CASCADE;

-- RLS有効化
ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."talents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."terms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."thumbnails" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."twitch_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."twitch_videos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."youtube_channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."youtube_videos" ENABLE ROW LEVEL SECURITY;

-- Policy定義
CREATE POLICY "Allow admin full access" ON "public"."announcements" USING (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Allow admins to read audit logs" ON "public"."audit_logs" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Allow public read access" ON "public"."talents" FOR SELECT USING (("deleted_at" IS NULL));
CREATE POLICY "Allow public read access" ON "public"."twitch_users" FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON "public"."twitch_videos" FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON "public"."youtube_channels" FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON "public"."youtube_videos" FOR SELECT USING (true);
CREATE POLICY "Allow public read access to enabled announcements" ON "public"."announcements" FOR SELECT USING (("enabled" = true));
CREATE POLICY "Enable insert for authenticated users" ON "public"."twitch_users" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Enable insert for authenticated users" ON "public"."twitch_videos" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Enable insert for authenticated users" ON "public"."youtube_channels" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Enable insert for authenticated users" ON "public"."youtube_videos" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Enable insert for authenticated users only" ON "public"."terms" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON "public"."terms" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."thumbnails" FOR SELECT USING (("deleted_at" IS NULL));
CREATE POLICY "Enable read access for all users" ON "public"."videos" FOR SELECT USING ((("deleted_at" IS NULL) AND ("visible" IS TRUE)));
CREATE POLICY "Enable read access with deleted contents for authenticated" ON "public"."talents" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Enable read access with deleted contents for authenticated " ON "public"."thumbnails" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Enable read access with deleted contents for authenticated " ON "public"."videos" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Enable update for authenticated users" ON "public"."twitch_users" FOR UPDATE TO "authenticated" USING (true);
CREATE POLICY "Enable update for authenticated users" ON "public"."twitch_videos" FOR UPDATE TO "authenticated" USING (true);
CREATE POLICY "Enable update for authenticated users" ON "public"."youtube_channels" FOR UPDATE TO "authenticated" USING (true);
CREATE POLICY "Enable update for authenticated users" ON "public"."youtube_videos" FOR UPDATE TO "authenticated" USING (true);
CREATE POLICY "Enable update for authenticated users only" ON "public"."talents" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON "public"."terms" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON "public"."thumbnails" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON "public"."videos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);

-- Grant文（代表例）
GRANT ALL ON FUNCTION "public"."get_audit_logs"("p_limit" integer, "p_offset" integer, "p_sort_by" "text", "p_sort_direction" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_audit_logs"("p_limit" integer, "p_offset" integer, "p_sort_by" "text", "p_sort_direction" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_audit_logs"("p_limit" integer, "p_offset" integer, "p_sort_by" "text", "p_sort_direction" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."insert_audit_log"("p_action" "public"."audit_action", "p_target_table" "text", "p_target_record_id" "uuid", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_audit_log"("p_action" "public"."audit_action", "p_target_table" "text", "p_target_record_id" "uuid", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_audit_log"("p_action" "public"."audit_action", "p_target_table" "text", "p_target_record_id" "uuid", "p_details" "jsonb") TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."videos" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."videos" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."videos" TO "service_role";
GRANT SELECT("title") ON TABLE "public"."videos" TO "anon";
GRANT SELECT("duration") ON TABLE "public"."videos" TO "anon";
GRANT SELECT("published_at") ON TABLE "public"."videos" TO "anon";
GRANT ALL ON FUNCTION "public"."search_videos_v2"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."search_videos_v2"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_videos_v2"("query" "text", "until" timestamp with time zone, "channel_ids" "uuid"[], "perpage" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."suggestions_v2"("p_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."suggestions_v2"("p_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."suggestions_v2"("p_query" "text") TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."announcements" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."announcements" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."announcements" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."audit_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."audit_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."audit_logs" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."talents" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."talents" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."talents" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."terms" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."terms" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."terms" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."thumbnails" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."thumbnails" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."thumbnails" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."twitch_users" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."twitch_users" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."twitch_users" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."twitch_videos" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."twitch_videos" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."twitch_videos" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."youtube_channels" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."youtube_channels" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."youtube_channels" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."youtube_videos" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."youtube_videos" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."youtube_videos" TO "service_role";
