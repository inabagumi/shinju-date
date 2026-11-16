-- Update the popularity of the terms in one statement (#6934)
--
-- The batch app used to read every term and upsert whole rows with the new
-- popularity. The read stopped at the 1,000 rows of `max_rows`, so terms after
-- them were never updated, and the upsert overwrote edits made in the admin
-- app between the read and the write with the old values.
--
-- This function writes only `popularity`. It takes an array of
-- `{ "term": text, "score": integer }` objects, matches `term` ignoring the
-- case, and returns the number of rows it updated. Items without a term or a
-- score are ignored, and when several items match the same term, the highest
-- score wins.
--
-- SECURITY INVOKER (the default): RLS applies as for the caller. Only the
-- service role (batch) may run it.

CREATE OR REPLACE FUNCTION "public"."update_terms_popularity"("p_items" "jsonb") RETURNS integer
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  WITH "items" AS (
    SELECT
      lower("item" ->> 'term') AS "term",
      max(("item" ->> 'score')::integer) AS "score"
    FROM jsonb_array_elements("p_items") AS "item"
    WHERE "item" ->> 'term' IS NOT NULL
      AND "item" ->> 'score' IS NOT NULL
    GROUP BY lower("item" ->> 'term')
  ),
  "updated" AS (
    UPDATE "public"."terms" AS "t"
    SET "popularity" = "i"."score"
    FROM "items" AS "i"
    WHERE lower("t"."term") = "i"."term"
    RETURNING 1
  )
  SELECT count(*)::integer FROM "updated";
$$;

ALTER FUNCTION "public"."update_terms_popularity"("p_items" "jsonb") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."update_terms_popularity"("p_items" "jsonb") IS
    'Sets the popularity of the terms matching the given terms (ignoring the case) to the given scores, without touching the other columns. Takes an array of { term, score } objects and returns the number of rows updated.';

REVOKE ALL ON FUNCTION "public"."update_terms_popularity"("p_items" "jsonb") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."update_terms_popularity"("p_items" "jsonb") FROM "anon";
REVOKE ALL ON FUNCTION "public"."update_terms_popularity"("p_items" "jsonb") FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."update_terms_popularity"("p_items" "jsonb") TO "service_role";
