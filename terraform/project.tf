locals {
  # すべてのプロジェクトに設定する環境変数。キーはリソースのアドレスの一部になる
  common_environment_variables = {
    enable_experimental_corepack = {
      key    = "ENABLE_EXPERIMENTAL_COREPACK"
      target = ["production", "preview"]
      value  = "1"
    }
    turbo_platform_env_disabled = {
      key    = "TURBO_PLATFORM_ENV_DISABLED"
      target = ["production", "preview"]
      value  = "true"
    }
    use_bytecode_caching = {
      key    = "USE_BYTECODE_CACHING"
      target = ["production"]
      value  = "1"
    }
    upstash_redis_rest_token = {
      key       = "UPSTASH_REDIS_REST_TOKEN"
      sensitive = true
      target    = ["production"]
      value     = var.upstash_redis_rest_token
    }
    # development を含む環境変数は sensitive = true にできない（Vercel の制約）
    upstash_redis_rest_token_dev = {
      key    = "UPSTASH_REDIS_REST_TOKEN"
      target = ["preview", "development"]
      value  = var.upstash_redis_rest_token_dev
    }
    upstash_redis_rest_url = {
      key       = "UPSTASH_REDIS_REST_URL"
      sensitive = true
      target    = ["production"]
      value     = var.upstash_redis_rest_url
    }
    upstash_redis_rest_url_dev = {
      key    = "UPSTASH_REDIS_REST_URL"
      target = ["preview", "development"]
      value  = var.upstash_redis_rest_url_dev
    }
  }

  # プロジェクトごとの違い。キーはリソースのアドレスの一部になる
  projects = {
    web = {
      name                      = "shinju-date"
      root_directory            = "apps/web"
      function_default_cpu_type = "standard"
      function_default_timeout  = 30
      environment_variables = {
        base_url = {
          key    = "NEXT_PUBLIC_BASE_URL"
          target = ["production"]
          value  = "https://${local.domain}"
        }
      }
    }
    admin = {
      name           = "shinju-date-admin"
      root_directory = "apps/admin"
      # standard_legacy は 0.6 vCPU（standard は 1 vCPU）。resource_config を
      # 足したとき（#4624）から管理画面だけこの値で、理由は記録されていない
      function_default_cpu_type = "standard_legacy"
      function_default_timeout  = 30
      environment_variables     = {}
    }
    batch = {
      name                      = "shinju-date-batch"
      root_directory            = "apps/batch"
      function_default_cpu_type = "standard"
      function_default_timeout  = 120
      environment_variables = {
        google_api_key = {
          key       = "GOOGLE_API_KEY"
          sensitive = true
          target    = ["production", "preview"]
          value     = var.google_api_key
        }
        # development を含む環境変数は sensitive = true にできない（Vercel の制約）
        google_api_key_development = {
          key    = "GOOGLE_API_KEY"
          target = ["development"]
          value  = var.google_api_key
        }
        cron_secret = {
          key       = "CRON_SECRET"
          sensitive = true
          target    = ["production"]
          value     = random_password.cron_secret.result
        }
      }
    }
  }

  # プロジェクトと環境変数の組み合わせ。キーは「<プロジェクト>/<環境変数>」
  environment_variables = merge([
    for project_key, project in local.projects : {
      for name, variable in merge(local.common_environment_variables, project.environment_variables) :
      "${project_key}/${name}" => merge(variable, { project = project_key })
    }
  ]...)
}

resource "vercel_project" "this" {
  for_each = local.projects

  enable_affected_projects_deployments = true
  framework                            = "nextjs"
  git_repository = {
    production_branch = "main"
    repo              = "inabagumi/shinju-date"
    type              = "github"
  }
  name                         = each.value.name
  node_version                 = "26.x"
  prioritise_production_builds = true
  root_directory               = each.value.root_directory
  resource_config = {
    function_default_regions  = ["hnd1"]
    function_default_cpu_type = each.value.function_default_cpu_type
    function_default_timeout  = each.value.function_default_timeout
  }
  team_id = var.vercel_team_id
  vercel_authentication = {
    deployment_type = "standard_protection"
  }
}

resource "random_password" "cron_secret" {
  length  = 16
  special = false
}

resource "vercel_project_environment_variable" "this" {
  for_each = local.environment_variables

  key        = each.value.key
  sensitive  = try(each.value.sensitive, false)
  project_id = vercel_project.this[each.value.project].id
  target     = each.value.target
  team_id    = vercel_project.this[each.value.project].team_id
  value      = each.value.value
}

resource "vercel_project_deployment_retention" "this" {
  for_each = vercel_project.this

  expiration_canceled   = "1m"
  expiration_errored    = "1m"
  expiration_preview    = "1m"
  expiration_production = "1m"
  project_id            = each.value.id
  team_id               = each.value.team_id
}
