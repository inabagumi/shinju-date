-- Readings of the talents (#6877)
--
-- The public site sorts the list of talents by the reading, because names
-- written in kanji would otherwise be sorted by their code points. Readings
-- are written in hiragana like `terms.readings`, and talents without one come
-- last. The public RLS policy is unchanged: anyone can read talents that are
-- not deleted.

ALTER TABLE "public"."talents"
    ADD COLUMN "reading" "text";

COMMENT ON COLUMN "public"."talents"."reading" IS
    'Reading of the name in hiragana (and the long vowel mark ー). The public site sorts the list of talents by it; talents without a reading come last, sorted by name.';
