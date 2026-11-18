# for_each にまとめる前のアドレスから移す（#7120）。適用したあとは消してよい

moved {
  from = vercel_project.this
  to   = vercel_project.this["web"]
}

moved {
  from = vercel_project.admin
  to   = vercel_project.this["admin"]
}

moved {
  from = vercel_project.batch
  to   = vercel_project.this["batch"]
}

moved {
  from = vercel_project_deployment_retention.this
  to   = vercel_project_deployment_retention.this["web"]
}

moved {
  from = vercel_project_deployment_retention.admin
  to   = vercel_project_deployment_retention.this["admin"]
}

moved {
  from = vercel_project_deployment_retention.batch
  to   = vercel_project_deployment_retention.this["batch"]
}

moved {
  from = vercel_project_environment_variable.enable_experimental_corepack
  to   = vercel_project_environment_variable.this["web/enable_experimental_corepack"]
}

moved {
  from = vercel_project_environment_variable.turbo_platform_env_disabled
  to   = vercel_project_environment_variable.this["web/turbo_platform_env_disabled"]
}

moved {
  from = vercel_project_environment_variable.use_bytecode_caching
  to   = vercel_project_environment_variable.this["web/use_bytecode_caching"]
}

moved {
  from = vercel_project_environment_variable.base_url
  to   = vercel_project_environment_variable.this["web/base_url"]
}

moved {
  from = vercel_project_environment_variable.upstash_redis_rest_token
  to   = vercel_project_environment_variable.this["web/upstash_redis_rest_token"]
}

moved {
  from = vercel_project_environment_variable.upstash_redis_rest_token_dev
  to   = vercel_project_environment_variable.this["web/upstash_redis_rest_token_dev"]
}

moved {
  from = vercel_project_environment_variable.upstash_redis_rest_url
  to   = vercel_project_environment_variable.this["web/upstash_redis_rest_url"]
}

moved {
  from = vercel_project_environment_variable.upstash_redis_rest_url_dev
  to   = vercel_project_environment_variable.this["web/upstash_redis_rest_url_dev"]
}

moved {
  from = vercel_project_environment_variable.admin_enable_experimental_corepack
  to   = vercel_project_environment_variable.this["admin/enable_experimental_corepack"]
}

moved {
  from = vercel_project_environment_variable.admin_turbo_platform_env_disabled
  to   = vercel_project_environment_variable.this["admin/turbo_platform_env_disabled"]
}

moved {
  from = vercel_project_environment_variable.admin_use_bytecode_caching
  to   = vercel_project_environment_variable.this["admin/use_bytecode_caching"]
}

moved {
  from = vercel_project_environment_variable.admin_upstash_redis_rest_token
  to   = vercel_project_environment_variable.this["admin/upstash_redis_rest_token"]
}

moved {
  from = vercel_project_environment_variable.admin_upstash_redis_rest_token_dev
  to   = vercel_project_environment_variable.this["admin/upstash_redis_rest_token_dev"]
}

moved {
  from = vercel_project_environment_variable.admin_upstash_redis_rest_url
  to   = vercel_project_environment_variable.this["admin/upstash_redis_rest_url"]
}

moved {
  from = vercel_project_environment_variable.admin_upstash_redis_rest_url_dev
  to   = vercel_project_environment_variable.this["admin/upstash_redis_rest_url_dev"]
}

moved {
  from = vercel_project_environment_variable.batch_enable_experimental_corepack
  to   = vercel_project_environment_variable.this["batch/enable_experimental_corepack"]
}

moved {
  from = vercel_project_environment_variable.batch_turbo_platform_env_disabled
  to   = vercel_project_environment_variable.this["batch/turbo_platform_env_disabled"]
}

moved {
  from = vercel_project_environment_variable.batch_use_bytecode_caching
  to   = vercel_project_environment_variable.this["batch/use_bytecode_caching"]
}

moved {
  from = vercel_project_environment_variable.batch_upstash_redis_rest_token
  to   = vercel_project_environment_variable.this["batch/upstash_redis_rest_token"]
}

moved {
  from = vercel_project_environment_variable.batch_upstash_redis_rest_token_dev
  to   = vercel_project_environment_variable.this["batch/upstash_redis_rest_token_dev"]
}

moved {
  from = vercel_project_environment_variable.batch_upstash_redis_rest_url
  to   = vercel_project_environment_variable.this["batch/upstash_redis_rest_url"]
}

moved {
  from = vercel_project_environment_variable.batch_upstash_redis_rest_url_dev
  to   = vercel_project_environment_variable.this["batch/upstash_redis_rest_url_dev"]
}

moved {
  from = vercel_project_environment_variable.batch_google_api_key
  to   = vercel_project_environment_variable.this["batch/google_api_key"]
}

moved {
  from = vercel_project_environment_variable.batch_google_api_key_development
  to   = vercel_project_environment_variable.this["batch/google_api_key_development"]
}

moved {
  from = vercel_project_environment_variable.batch_cron_secret
  to   = vercel_project_environment_variable.this["batch/cron_secret"]
}
