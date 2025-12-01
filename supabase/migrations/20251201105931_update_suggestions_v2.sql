-- Update suggestions_v2 function to include popularity in sorting

CREATE OR REPLACE FUNCTION "public"."suggestions_v2"("p_query" "text") RETURNS TABLE("term" "text", "priority" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  RETURN QUERY
    WITH all_matches AS (
      SELECT t.id, t.term, t.popularity, 1 AS priority FROM terms AS t WHERE t.term &^ p_query OR t.term &^~ p_query
      UNION ALL
      SELECT t.id, t.term, t.popularity, 2 AS priority FROM terms AS t WHERE (t.readings &^ p_query OR t.readings &^~ p_query) AND NOT (t.term &^ p_query OR t.term &^~ p_query)
    )
    SELECT am.term, MIN(am.priority) AS min_priority
    FROM all_matches AS am
    GROUP BY am.id, am.term, am.popularity
    ORDER BY min_priority ASC, am.popularity DESC, length(am.term) ASC, am.term ASC
    LIMIT 10;
END;
$$;
