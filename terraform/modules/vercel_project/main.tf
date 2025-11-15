resource "vercel_project" "this" {
  enable_affected_projects_deployments = true
  framework                            = var.framework
  git_repository = {
    production_branch = "main"
    repo              = "inabagumi/shinju-date"
    type              = "github"
  }
  ignore_command               = "npx turbo-ignore"
  name                         = var.project_name
  prioritise_production_builds = true
  public_source                = false
  root_directory               = var.root_directory
  resource_config = {
    function_default_cpu_type = var.function_default_cpu_type
    function_default_regions  = var.function_default_regions
    function_default_timeout  = var.function_default_timeout
  }
  team_id = var.team_id
  vercel_authentication = {
    deployment_type = "standard_protection"
  }
}

# Common environment variables
resource "vercel_project_environment_variable" "corepack" {
  count = var.enable_corepack ? 1 : 0

  key        = "ENABLE_EXPERIMENTAL_COREPACK"
  project_id = vercel_project.this.id
  target     = ["production", "preview"]
  team_id    = vercel_project.this.team_id
  value      = "1"
}

resource "vercel_project_environment_variable" "bytecode_caching" {
  count = var.enable_bytecode_caching ? 1 : 0

  key        = "USE_BYTECODE_CACHING"
  project_id = vercel_project.this.id
  target     = ["production"]
  team_id    = vercel_project.this.team_id
  value      = "1"
}

# Redis environment variables
resource "vercel_project_environment_variable" "redis_token_prod" {
  count = var.enable_redis && var.upstash_redis_rest_token != "" ? 1 : 0

  key        = "UPSTASH_REDIS_REST_TOKEN"
  project_id = vercel_project.this.id
  target     = ["production"]
  team_id    = vercel_project.this.team_id
  value      = var.upstash_redis_rest_token
}

resource "vercel_project_environment_variable" "redis_token_dev" {
  count = var.enable_redis && var.upstash_redis_rest_token_dev != "" ? 1 : 0

  key        = "UPSTASH_REDIS_REST_TOKEN"
  project_id = vercel_project.this.id
  target     = ["preview", "development"]
  team_id    = vercel_project.this.team_id
  value      = var.upstash_redis_rest_token_dev
}

resource "vercel_project_environment_variable" "redis_url_prod" {
  count = var.enable_redis && var.upstash_redis_rest_url != "" ? 1 : 0

  key        = "UPSTASH_REDIS_REST_URL"
  project_id = vercel_project.this.id
  target     = ["production"]
  team_id    = vercel_project.this.team_id
  value      = var.upstash_redis_rest_url
}

resource "vercel_project_environment_variable" "redis_url_dev" {
  count = var.enable_redis && var.upstash_redis_rest_url_dev != "" ? 1 : 0

  key        = "UPSTASH_REDIS_REST_URL"
  project_id = vercel_project.this.id
  target     = ["preview", "development"]
  team_id    = vercel_project.this.team_id
  value      = var.upstash_redis_rest_url_dev
}

# Custom environment variables
resource "vercel_project_environment_variable" "custom" {
  for_each = var.environment_variables

  key        = each.key
  project_id = vercel_project.this.id
  target     = each.value.target
  team_id    = vercel_project.this.team_id
  value      = each.value.value
}

# Deployment retention
resource "vercel_project_deployment_retention" "this" {
  expiration_canceled   = var.deployment_retention.expiration_canceled
  expiration_errored    = var.deployment_retention.expiration_errored
  expiration_preview    = var.deployment_retention.expiration_preview
  expiration_production = var.deployment_retention.expiration_production
  project_id            = vercel_project.this.id
  team_id               = vercel_project.this.team_id
}
