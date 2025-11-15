# Web project (shinju-date)
module "web" {
  source = "./modules/vercel_project"

  project_name                  = "shinju-date"
  root_directory                = "apps/web"
  framework                     = "nextjs"
  team_id                       = var.vercel_team_id
  function_default_cpu_type     = "standard"
  function_default_timeout      = 30
  upstash_redis_rest_token      = var.upstash_redis_rest_token
  upstash_redis_rest_token_dev  = var.upstash_redis_rest_token_dev
  upstash_redis_rest_url        = var.upstash_redis_rest_url
  upstash_redis_rest_url_dev    = var.upstash_redis_rest_url_dev

  environment_variables = {
    NEXT_PUBLIC_BASE_URL = {
      value  = "https://shinju.date"
      target = ["production"]
    }
  }
}

# Admin project (shinju-date-admin)
module "admin" {
  source = "./modules/vercel_project"

  project_name                  = "shinju-date-admin"
  root_directory                = "apps/admin"
  framework                     = "nextjs"
  team_id                       = var.vercel_team_id
  function_default_cpu_type     = "standard_legacy"
  function_default_timeout      = 30
  upstash_redis_rest_token      = var.upstash_redis_rest_token
  upstash_redis_rest_token_dev  = var.upstash_redis_rest_token_dev
  upstash_redis_rest_url        = var.upstash_redis_rest_url
  upstash_redis_rest_url_dev    = var.upstash_redis_rest_url_dev
}

# Batch project (shinju-date-batch)
resource "random_password" "cron_secret" {
  length  = 16
  special = false
}

module "batch" {
  source = "./modules/vercel_project"

  project_name                  = "shinju-date-batch"
  root_directory                = "apps/batch"
  framework                     = null
  team_id                       = var.vercel_team_id
  function_default_cpu_type     = "standard"
  function_default_timeout      = 120
  upstash_redis_rest_token      = var.upstash_redis_rest_token
  upstash_redis_rest_token_dev  = var.upstash_redis_rest_token_dev
  upstash_redis_rest_url        = var.upstash_redis_rest_url
  upstash_redis_rest_url_dev    = var.upstash_redis_rest_url_dev

  environment_variables = {
    GOOGLE_API_KEY = {
      value  = var.google_api_key
      target = ["production", "preview", "development"]
    }
    CRON_SECRET = {
      value  = random_password.cron_secret.result
      target = ["production"]
    }
  }
}

# Insights project (shinju-date-insights) - NEW
module "insights" {
  source = "./modules/vercel_project"

  project_name                  = "shinju-date-insights"
  root_directory                = "apps/insights"
  framework                     = null
  team_id                       = var.vercel_team_id
  function_default_cpu_type     = "standard"
  function_default_timeout      = 60
  enable_redis                  = false
  enable_corepack               = false
  enable_bytecode_caching       = false

  environment_variables = {
    NEXT_PUBLIC_SUPABASE_URL = {
      value  = var.supabase_url
      target = ["production", "preview", "development"]
    }
    SUPABASE_SERVICE_ROLE_KEY = {
      value  = var.supabase_service_role_key
      target = ["production", "preview", "development"]
    }
  }
}
