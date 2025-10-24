import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from supabase import Client, create_client

from services.database import get_existing_terms, get_video_titles
from services.term_extractor import extract_frequent_terms

load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None

app = FastAPI()


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Insights API is running"}


@app.post("/api/v1/terms/analysis")
def analysis_terms_endpoint():
    """Extract frequent terms from video titles stored in Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY or not supabase:
        raise HTTPException(
            status_code=500, detail="Supabase URL/Key is not configured."
        )

    try:
        video_titles = get_video_titles(supabase)

        if not video_titles:
            return {
                "status": "success",
                "message": "No titles found in the database.",
                "extracted_terms": [],
            }

        existing_terms = get_existing_terms(supabase)
        terms = extract_frequent_terms(
            video_titles, min_count=10, min_length=3, existing_terms=existing_terms
        )

        return {
            "status": "success",
            "message": (
                f"{len(terms)} terms were extracted from {len(video_titles)} titles."
            ),
            "extracted_terms": terms,
        }

    except Exception as e:
        print(f"Error occurred: {e}")
        raise HTTPException(
            status_code=500, detail=f"An internal server error occurred: {str(e)}"
        )
