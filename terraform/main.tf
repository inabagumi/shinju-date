terraform {
  cloud {
    organization = "inabagumi"

    workspaces {
      name = "shinju-date"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
}

# Web project (shinju-date)
module "web" {
  source = "./modules/vercel_project"

  project_name                 = "shinju-date"
  root_directory               = "apps/web"
  framework                    = "nextjs"
  team_id                      = var.vercel_team_id
  function_default_cpu_type    = "standard"
  function_default_timeout     = 30
  upstash_redis_rest_token     = var.upstash_redis_rest_token
  upstash_redis_rest_token_dev = var.upstash_redis_rest_token_dev
  upstash_redis_rest_url       = var.upstash_redis_rest_url
  upstash_redis_rest_url_dev   = var.upstash_redis_rest_url_dev

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

  project_name                 = "shinju-date-admin"
  root_directory               = "apps/admin"
  framework                    = "nextjs"
  team_id                      = var.vercel_team_id
  function_default_cpu_type    = "standard_legacy"
  function_default_timeout     = 30
  upstash_redis_rest_token     = var.upstash_redis_rest_token
  upstash_redis_rest_token_dev = var.upstash_redis_rest_token_dev
  upstash_redis_rest_url       = var.upstash_redis_rest_url
  upstash_redis_rest_url_dev   = var.upstash_redis_rest_url_dev
}

# Batch project (shinju-date-batch)
resource "random_password" "cron_secret" {
  length  = 16
  special = false
}

module "batch" {
  source = "./modules/vercel_project"

  project_name                 = "shinju-date-batch"
  root_directory               = "apps/batch"
  framework                    = null
  team_id                      = var.vercel_team_id
  function_default_cpu_type    = "standard"
  function_default_timeout     = 120
  upstash_redis_rest_token     = var.upstash_redis_rest_token
  upstash_redis_rest_token_dev = var.upstash_redis_rest_token_dev
  upstash_redis_rest_url       = var.upstash_redis_rest_url
  upstash_redis_rest_url_dev   = var.upstash_redis_rest_url_dev

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

  project_name              = "shinju-date-insights"
  root_directory            = "apps/insights"
  framework                 = null
  team_id                   = var.vercel_team_id
  function_default_cpu_type = "standard"
  function_default_timeout  = 60
  enable_redis              = false
  enable_corepack           = false
  enable_bytecode_caching   = false
}

# UI project (shinju-date-ui) - Storybook deployment
module "ui" {
  source = "./modules/vercel_project"

  project_name              = "shinju-date-ui"
  root_directory            = "packages/ui"
  framework                 = null
  team_id                   = var.vercel_team_id
  function_default_cpu_type = "standard"
  function_default_timeout  = 30
  enable_redis              = false
  enable_corepack           = true
  enable_bytecode_caching   = false
}

# DNS Records
module "dns_digicert_caa" {
  source = "./modules/vercel_dns_record"

  domain  = "shinju.date"
  name    = ""
  team_id = module.web.team_id
  type    = "CAA"
  value   = "0 issue \"digicert.com\""
}

module "dns_google_site_verification" {
  source = "./modules/vercel_dns_record"

  domain  = "shinju.date"
  name    = ""
  team_id = module.web.team_id
  type    = "TXT"
  value   = "google-site-verification=B-AnwaokGJSxLYWtDEFi_NDp-GxH-aLGAMT8SsxTFL4"
}

module "dns_api" {
  source = "./modules/vercel_dns_record"

  domain  = "shinju.date"
  name    = "api"
  team_id = module.web.team_id
  type    = "CNAME"
  value   = "bxbalbupmqhcdqrmoiwl.supabase.co."
}

# Project Domains
module "domain_date" {
  source = "./modules/vercel_project_domain"

  domain     = "shinju.date"
  project_id = module.web.project_id
  team_id    = module.web.team_id
}

module "domain_cafe" {
  source = "./modules/vercel_project_domain"

  domain               = "search.animare.cafe"
  project_id           = module.web.project_id
  team_id              = module.web.team_id
  redirect             = module.domain_date.domain
  redirect_status_code = 308
}

module "domain_ink" {
  source = "./modules/vercel_project_domain"

  domain               = "schedule.774.ink"
  project_id           = module.web.project_id
  team_id              = module.web.team_id
  redirect             = module.domain_date.domain
  redirect_status_code = 308
}

module "domain_admin" {
  source = "./modules/vercel_project_domain"

  domain     = "admin.shinju.date"
  project_id = module.admin.project_id
  team_id    = module.admin.team_id
}
