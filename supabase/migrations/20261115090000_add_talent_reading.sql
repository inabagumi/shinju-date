-- Readings of the talents (#6894)
--
-- The public site sorts the list of talents by the reading, because names
-- written in kanji would otherwise be sorted by their code points. Readings
-- are written in hiragana like `terms.readings`, and talents without one come
-- last. The public RLS policy is unchanged: anyone can read talents that are
-- not deleted.
--
-- The column uses the Japanese ICU collation instead of the default of the
-- database, which differs between environments. With it, the long vowel mark
-- sorts as the vowel before it (かあ, かーる, かある, かい), while the default
-- ICU and libc collations ignore it (かーる before かあ) and "C" sorts it
-- after every hiragana (かんな before かーる).

ALTER TABLE "public"."talents"
    ADD COLUMN "reading" "text" COLLATE "ja-x-icu";

COMMENT ON COLUMN "public"."talents"."reading" IS
    'Reading of the name in hiragana (and the long vowel mark ー). The public site sorts the list of talents by it in the order of the Japanese syllabary (ja-x-icu); talents without a reading come last, sorted by name.';
