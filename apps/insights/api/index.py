import os
from fastapi import FastAPI, HTTPException
from supabase import create_client, Client
from services.term_extractor import extract_frequent_terms
from dotenv import load_dotenv

# .envファイルから環境変数を読み込む (ローカル開発用)
load_dotenv()

# --- Supabase接続情報 ---
# Vercelの環境変数から取得する
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Supabaseクライアントを初期化
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# FastAPIアプリケーションをインスタンス化
app = FastAPI()


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Insights API is running"}


@app.post("/api/v1/terms/analysis")
def analysis_terms_endpoint():
    """
    Supabaseから動画タイトルを取得し、頻出用語を抽出して結果を返すエンドポイント
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(
            status_code=500, detail="Supabase URL/Key is not configured.")

    try:
        # --- Supabaseから動画タイトルを取得 ---
        # "videos"テーブルから"title"カラムの全データを取得
        response = supabase.table('videos').select('title').execute()

        # APIレスポンスからタイトルのみをリストとして抽出
        video_titles = [item['title'] for item in response.data]

        if not video_titles:
            return {
                "status": "success",
                "message": "No titles found in the database.",
                "extracted_terms": []
            }

        # コアロジックを呼び出して用語を抽出
        terms = extract_frequent_terms(video_titles, min_count=10)

        return {
            "status": "success",
            "message": f"{len(terms)} terms were extracted from {len(video_titles)} titles.",
            "extracted_terms": terms
        }

    except Exception as e:
        print(f"Error occurred: {e}")
        raise HTTPException(
            status_code=500, detail=f"An internal server error occurred: {str(e)}")
