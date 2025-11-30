from decouple import config

# Supabase
NEXT_PUBLIC_SUPABASE_URL = config("NEXT_PUBLIC_SUPABASE_URL", default="")
SUPABASE_SERVICE_ROLE_KEY = config("SUPABASE_SERVICE_ROLE_KEY", default="")

# Upstash Redis
UPSTASH_REDIS_URL = config("UPSTASH_REDIS_URL", default="")
UPSTASH_REDIS_TOKEN = config("UPSTASH_REDIS_TOKEN", default="")

# Cron
CRON_SECRET = config("CRON_SECRET", default="")

# Sentry
NEXT_PUBLIC_SENTRY_DSN = config("NEXT_PUBLIC_SENTRY_DSN", default="")
