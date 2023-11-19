resource "vercel_project" "this" {
  framework = "nextjs"
  git_repository = {
    production_branch = "main"
    repo              = "inabagumi/shinju-date"
    type              = "github"
  }
  name                       = "shinju-date"
  public_source              = false
  root_directory             = "apps/web"
  serverless_function_region = "hnd1"
  team_id                    = var.vercel_team_id
  vercel_authentication = {
    protect_production = false
  }
}

resource "vercel_project_domain" "date" {
  domain     = "shinju.date"
  project_id = vercel_project.this.id
  team_id    = vercel_project.this.team_id
}

resource "vercel_project_domain" "cafe" {
  domain               = "search.animare.cafe"
  project_id           = vercel_project.this.id
  redirect             = vercel_project_domain.date.domain
  redirect_status_code = 308
  team_id              = vercel_project.this.team_id
}

resource "vercel_project_domain" "ink" {
  domain               = "schedule.774.ink"
  project_id           = vercel_project.this.id
  redirect             = vercel_project_domain.date.domain
  redirect_status_code = 308
  team_id              = vercel_project.this.team_id
}

resource "vercel_project_environment_variable" "base_url" {
  key        = "NEXT_PUBLIC_BASE_URL"
  project_id = vercel_project.this.id
  target     = ["production"]
  team_id    = vercel_project.this.team_id
  value      = "https://shinju.date"
}

resource "vercel_project_environment_variable" "upstash_redis_rest_token" {
  key        = "UPSTASH_REDIS_REST_TOKEN"
  project_id = vercel_project.this.id
  target     = ["production"]
  team_id    = vercel_project.this.team_id
  value      = var.upstash_redis_rest_token
}

resource "vercel_project_environment_variable" "upstash_redis_rest_token_dev" {
  key        = "UPSTASH_REDIS_REST_TOKEN"
  project_id = vercel_project.this.id
  target     = ["preview", "development"]
  team_id    = vercel_project.this.team_id
  value      = var.upstash_redis_rest_token_dev
}

resource "vercel_project_environment_variable" "upstash_redis_rest_url" {
  key        = "UPSTASH_REDIS_REST_URL"
  project_id = vercel_project.this.id
  target     = ["production"]
  team_id    = vercel_project.this.team_id
  value      = var.upstash_redis_rest_url
}

resource "vercel_project_environment_variable" "upstash_redis_rest_url_dev" {
  key        = "UPSTASH_REDIS_REST_URL"
  project_id = vercel_project.this.id
  target     = ["preview", "development"]
  team_id    = vercel_project.this.team_id
  value      = var.upstash_redis_rest_url_dev
}

resource "vercel_project" "admin" {
  framework = "nextjs"
  git_repository = {
    production_branch = "main"
    repo              = "inabagumi/shinju-date"
    type              = "github"
  }
  name                       = "shinju-date-admin"
  public_source              = false
  root_directory             = "apps/admin"
  serverless_function_region = "hnd1"
  team_id                    = var.vercel_team_id
  vercel_authentication = {
    protect_production = false
  }
}

resource "vercel_project_domain" "admin" {
  domain     = "admin.shinju.date"
  project_id = vercel_project.admin.id
  team_id    = vercel_project.admin.team_id
}

resource "random_password" "cron_secret" {
  length  = 16
  special = false
}

resource "vercel_project_environment_variable" "admin_google_api_key" {
  key        = "GOOGLE_API_KEY"
  project_id = vercel_project.admin.id
  target     = ["production", "preview", "development"]
  team_id    = vercel_project.admin.team_id
  value      = var.google_api_key
}

resource "vercel_project_environment_variable" "admin_upstash_redis_rest_token" {
  key        = "UPSTASH_REDIS_REST_TOKEN"
  project_id = vercel_project.admin.id
  target     = ["production"]
  team_id    = vercel_project.admin.team_id
  value      = var.upstash_redis_rest_token
}

resource "vercel_project_environment_variable" "admin_upstash_redis_rest_token_dev" {
  key        = "UPSTASH_REDIS_REST_TOKEN"
  project_id = vercel_project.admin.id
  target     = ["preview", "development"]
  team_id    = vercel_project.admin.team_id
  value      = var.upstash_redis_rest_token_dev
}

resource "vercel_project_environment_variable" "admin_upstash_redis_rest_url" {
  key        = "UPSTASH_REDIS_REST_URL"
  project_id = vercel_project.admin.id
  target     = ["production"]
  team_id    = vercel_project.admin.team_id
  value      = var.upstash_redis_rest_url
}

resource "vercel_project_environment_variable" "admin_upstash_redis_rest_url_dev" {
  key        = "UPSTASH_REDIS_REST_URL"
  project_id = vercel_project.admin.id
  target     = ["preview", "development"]
  team_id    = vercel_project.admin.team_id
  value      = var.upstash_redis_rest_url_dev
}

resource "vercel_project_environment_variable" "cron_secret" {
  key        = "CRON_SECRET"
  project_id = vercel_project.admin.id
  target     = ["production"]
  team_id    = vercel_project.admin.team_id
  value      = random_password.cron_secret.result
}
