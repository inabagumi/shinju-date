resource "vercel_project" "this" {
  framework = "nextjs"
  git_repository = {
    production_branch = "main"
    repo              = "inabagumi/shinju-date"
    type              = "github"
  }
  ignore_command = "npx turbo-ignore"
  name           = "shinju-date"
  public_source  = false
  root_directory = "apps/web"
  resource_config = {
    function_default_cpu_type = "standard"
    function_default_timeout  = 30
  }
  serverless_function_region = "hnd1"
  team_id                    = var.vercel_team_id
  vercel_authentication = {
    deployment_type = "standard_protection"
  }
}

resource "vercel_project_environment_variable" "enable_experimental_corepack" {
  key        = "ENABLE_EXPERIMENTAL_COREPACK"
  project_id = vercel_project.this.id
  target     = ["production", "preview"]
  team_id    = vercel_project.this.team_id
  value      = "1"
}

resource "vercel_project_environment_variable" "use_bytecode_caching" {
  key        = "USE_BYTECODE_CACHING"
  project_id = vercel_project.this.id
  target     = ["production"]
  team_id    = vercel_project.this.team_id
  value      = "1"
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
  ignore_command = "npx turbo-ignore"
  name           = "shinju-date-admin"
  public_source  = false
  root_directory = "apps/admin"
  resource_config = {
    function_default_cpu_type = "standard_legacy"
    function_default_timeout  = 30
  }
  serverless_function_region = "hnd1"
  team_id                    = var.vercel_team_id
  vercel_authentication = {
    deployment_type = "standard_protection"
  }
}

resource "vercel_project_environment_variable" "admin_enable_experimental_corepack" {
  key        = "ENABLE_EXPERIMENTAL_COREPACK"
  project_id = vercel_project.admin.id
  target     = ["production", "preview"]
  team_id    = vercel_project.admin.team_id
  value      = "1"
}

resource "vercel_project_environment_variable" "admin_use_bytecode_caching" {
  key        = "USE_BYTECODE_CACHING"
  project_id = vercel_project.admin.id
  target     = ["production"]
  team_id    = vercel_project.admin.team_id
  value      = "1"
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

resource "vercel_project" "batch" {
  framework = "nextjs"
  git_repository = {
    production_branch = "main"
    repo              = "inabagumi/shinju-date"
    type              = "github"
  }
  ignore_command = "npx turbo-ignore"
  name           = "shinju-date-batch"
  public_source  = false
  root_directory = "apps/batch"
  resource_config = {
    function_default_cpu_type = "standard"
    function_default_timeout  = 120
  }
  serverless_function_region = "hnd1"
  team_id                    = var.vercel_team_id
  vercel_authentication = {
    deployment_type = "standard_protection"
  }
}

resource "random_password" "cron_secret" {
  length  = 16
  special = false
}

resource "vercel_project_environment_variable" "batch_enable_experimental_corepack" {
  key        = "ENABLE_EXPERIMENTAL_COREPACK"
  project_id = vercel_project.batch.id
  target     = ["production", "preview"]
  team_id    = vercel_project.batch.team_id
  value      = "1"
}

resource "vercel_project_environment_variable" "batch_use_bytecode_caching" {
  key        = "USE_BYTECODE_CACHING"
  project_id = vercel_project.batch.id
  target     = ["production"]
  team_id    = vercel_project.batch.team_id
  value      = "1"
}

resource "vercel_project_environment_variable" "batch_google_api_key" {
  key        = "GOOGLE_API_KEY"
  project_id = vercel_project.batch.id
  target     = ["production", "preview", "development"]
  team_id    = vercel_project.batch.team_id
  value      = var.google_api_key
}

resource "vercel_project_environment_variable" "batch_upstash_redis_rest_token" {
  key        = "UPSTASH_REDIS_REST_TOKEN"
  project_id = vercel_project.batch.id
  target     = ["production"]
  team_id    = vercel_project.batch.team_id
  value      = var.upstash_redis_rest_token
}

resource "vercel_project_environment_variable" "batch_upstash_redis_rest_token_dev" {
  key        = "UPSTASH_REDIS_REST_TOKEN"
  project_id = vercel_project.batch.id
  target     = ["preview", "development"]
  team_id    = vercel_project.batch.team_id
  value      = var.upstash_redis_rest_token_dev
}

resource "vercel_project_environment_variable" "batch_upstash_redis_rest_url" {
  key        = "UPSTASH_REDIS_REST_URL"
  project_id = vercel_project.batch.id
  target     = ["production"]
  team_id    = vercel_project.batch.team_id
  value      = var.upstash_redis_rest_url
}

resource "vercel_project_environment_variable" "batch_upstash_redis_rest_url_dev" {
  key        = "UPSTASH_REDIS_REST_URL"
  project_id = vercel_project.batch.id
  target     = ["preview", "development"]
  team_id    = vercel_project.batch.team_id
  value      = var.upstash_redis_rest_url_dev
}

resource "vercel_project_environment_variable" "batch_cron_secret" {
  key        = "CRON_SECRET"
  project_id = vercel_project.batch.id
  target     = ["production"]
  team_id    = vercel_project.batch.team_id
  value      = random_password.cron_secret.result
}
