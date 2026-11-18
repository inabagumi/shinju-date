locals {
  # すべてのプロジェクトに設定する環境変数
  common_environment_variables = {
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
    upstash_redis_rest_token_dev = {
      key       = "UPSTASH_REDIS_REST_TOKEN"
      sensitive = true
      target    = ["preview"]
      value     = var.upstash_redis_rest_token_dev
    }
    upstash_redis_rest_url = {
      key       = "UPSTASH_REDIS_REST_URL"
      sensitive = true
      target    = ["production"]
      value     = var.upstash_redis_rest_url
    }
    upstash_redis_rest_url_dev = {
      key       = "UPSTASH_REDIS_REST_URL"
      sensitive = true
      target    = ["preview"]
      value     = var.upstash_redis_rest_url_dev
    }
  }

  # admin と batch が必須にする、YouTube と Twitch の API のキー
  # （apps/admin/lib/env.ts と apps/batch/lib/env.ts の API_KEY_NAMES）
  #
  # 手で追加されていた環境変数は Sensitive ではなく、Vercel では作ったあとに sensitive を
  # 変えられない。作り直さずに取り込むために、いまの設定に合わせて sensitive = false にしている
  api_key_environment_variables = {
    google_api_key = {
      key       = "GOOGLE_API_KEY"
      sensitive = false
      target    = ["production", "preview"]
      value     = var.google_api_key
    }
    twitch_client_id = {
      key       = "TWITCH_CLIENT_ID"
      sensitive = false
      target    = ["production", "preview"]
      value     = var.twitch_client_id
    }
    twitch_client_secret = {
      key       = "TWITCH_CLIENT_SECRET"
      sensitive = false
      target    = ["production", "preview"]
      value     = var.twitch_client_secret
    }
  }

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
      # 管理画面は低いスペックで足りるため、ほかより小さい 0.6 vCPU にする
      function_default_cpu_type = "standard_legacy"
      function_default_timeout  = 30
      environment_variables     = local.api_key_environment_variables
    }
    batch = {
      name                      = "shinju-date-batch"
      root_directory            = "apps/batch"
      function_default_cpu_type = "standard"
      function_default_timeout  = 120
      environment_variables = merge(local.api_key_environment_variables, {
        # batch の GOOGLE_API_KEY は、はじめから Terraform が Sensitive として作っている
        google_api_key = merge(local.api_key_environment_variables.google_api_key, {
          sensitive = true
        })
        cron_secret = {
          key       = "CRON_SECRET"
          sensitive = true
          target    = ["production"]
          value     = random_password.cron_secret.result
        }
      })
    }
  }
}

module "project" {
  source   = "./modules/vercel-project"
  for_each = local.projects

  environment_variables     = merge(local.common_environment_variables, each.value.environment_variables)
  function_default_cpu_type = each.value.function_default_cpu_type
  function_default_timeout  = each.value.function_default_timeout
  name                      = each.value.name
  root_directory            = each.value.root_directory
  team_id                   = var.vercel_team_id
}

resource "random_password" "cron_secret" {
  length  = 16
  special = false
}
