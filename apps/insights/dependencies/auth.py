from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from config import CRON_SECRET

api_key_header = APIKeyHeader(name="Authorization")


async def verify_cron_request(api_key: str = Security(api_key_header)):
    if not api_key:
        raise HTTPException(status_code=401, detail="Authorization header is missing")

    try:
        scheme, _, credentials = api_key.partition(" ")
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=401, detail="Invalid authentication scheme"
            )
    except ValueError:
        raise HTTPException(
            status_code=401, detail="Invalid authorization header format"
        )

    if credentials != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Invalid cron secret")
