import sentry_sdk
from fastapi import Depends, FastAPI, HTTPException
from supabase import Client, create_client

from config import (
    NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)
from dependencies.auth import verify_cron_request
from logging import setup_logging
from services.database import get_existing_terms, get_video_titles
from services.term_extractor import extract_frequent_terms

setup_logging()

if NEXT_PUBLIC_SENTRY_DSN:
    sentry_sdk.init(
        dsn=NEXT_PUBLIC_SENTRY_DSN,
        # Set traces_sample_rate to 1.0 to capture 100%
        # of transactions for performance monitoring.
        traces_sample_rate=1.0,
        # Set profiles_sample_rate to 1.0 to profile 100%
        # of sampled transactions.
        # We recommend adjusting this value in production.
        profiles_sample_rate=1.0,
    )

if NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase: Client = create_client(
        NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    )
else:
    supabase = None

app = FastAPI()


@app.exception_handler(Exception)
async def sentry_exception_handler(request, exc):
    sentry_sdk.capture_exception(exc)
    # You can also add your own custom error handling logic here
    # and return a custom response.
    return HTTPException(status_code=500, detail="Internal Server Error")


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Insights API is running"}


@app.get("/api/healthz")
def healthz_endpoint():
    return {"status": "ok"}


@app.get("/api/readyz")
def readyz_endpoint():
    if not supabase:
        raise HTTPException(
            status_code=503, detail="Supabase client is not configured"
        )
    try:
        supabase.table("videos").select("id").limit(1).execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {e}")


@app.post(
    "/api/v1/terms/analysis", dependencies=[Depends(verify_cron_request)]
)
def analysis_terms_endpoint():
    """Extract frequent terms from video titles stored in Supabase."""
    if not supabase:
        raise HTTPException(
            status_code=500, detail="Supabase client is not configured."
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
