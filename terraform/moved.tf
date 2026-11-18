moved {
  from = vercel_project.this
  to   = module.project["web"].vercel_project.this
}

moved {
  from = vercel_project_deployment_retention.this
  to   = module.project["web"].vercel_project_deployment_retention.this
}

moved {
  from = vercel_project.admin
  to   = module.project["admin"].vercel_project.this
}

moved {
  from = vercel_project_deployment_retention.admin
  to   = module.project["admin"].vercel_project_deployment_retention.this
}

moved {
  from = vercel_project.batch
  to   = module.project["batch"].vercel_project.this
}

moved {
  from = vercel_project_deployment_retention.batch
  to   = module.project["batch"].vercel_project_deployment_retention.this
}

moved {
  from = vercel_project_environment_variable.turbo_platform_env_disabled
  to   = module.project["web"].vercel_project_environment_variable.this["turbo_platform_env_disabled"]
}

moved {
  from = vercel_project_environment_variable.use_bytecode_caching
  to   = module.project["web"].vercel_project_environment_variable.this["use_bytecode_caching"]
}

moved {
  from = vercel_project_environment_variable.upstash_redis_rest_token
  to   = module.project["web"].vercel_project_environment_variable.this["upstash_redis_rest_token"]
}

moved {
  from = vercel_project_environment_variable.upstash_redis_rest_token_dev
  to   = module.project["web"].vercel_project_environment_variable.this["upstash_redis_rest_token_dev"]
}

moved {
  from = vercel_project_environment_variable.upstash_redis_rest_url
  to   = module.project["web"].vercel_project_environment_variable.this["upstash_redis_rest_url"]
}

moved {
  from = vercel_project_environment_variable.upstash_redis_rest_url_dev
  to   = module.project["web"].vercel_project_environment_variable.this["upstash_redis_rest_url_dev"]
}

moved {
  from = vercel_project_environment_variable.base_url
  to   = module.project["web"].vercel_project_environment_variable.this["base_url"]
}

moved {
  from = vercel_project_environment_variable.admin_turbo_platform_env_disabled
  to   = module.project["admin"].vercel_project_environment_variable.this["turbo_platform_env_disabled"]
}

moved {
  from = vercel_project_environment_variable.admin_use_bytecode_caching
  to   = module.project["admin"].vercel_project_environment_variable.this["use_bytecode_caching"]
}

moved {
  from = vercel_project_environment_variable.admin_upstash_redis_rest_token
  to   = module.project["admin"].vercel_project_environment_variable.this["upstash_redis_rest_token"]
}

moved {
  from = vercel_project_environment_variable.admin_upstash_redis_rest_token_dev
  to   = module.project["admin"].vercel_project_environment_variable.this["upstash_redis_rest_token_dev"]
}

moved {
  from = vercel_project_environment_variable.admin_upstash_redis_rest_url
  to   = module.project["admin"].vercel_project_environment_variable.this["upstash_redis_rest_url"]
}

moved {
  from = vercel_project_environment_variable.admin_upstash_redis_rest_url_dev
  to   = module.project["admin"].vercel_project_environment_variable.this["upstash_redis_rest_url_dev"]
}

moved {
  from = vercel_project_environment_variable.batch_turbo_platform_env_disabled
  to   = module.project["batch"].vercel_project_environment_variable.this["turbo_platform_env_disabled"]
}

moved {
  from = vercel_project_environment_variable.batch_use_bytecode_caching
  to   = module.project["batch"].vercel_project_environment_variable.this["use_bytecode_caching"]
}

moved {
  from = vercel_project_environment_variable.batch_upstash_redis_rest_token
  to   = module.project["batch"].vercel_project_environment_variable.this["upstash_redis_rest_token"]
}

moved {
  from = vercel_project_environment_variable.batch_upstash_redis_rest_token_dev
  to   = module.project["batch"].vercel_project_environment_variable.this["upstash_redis_rest_token_dev"]
}

moved {
  from = vercel_project_environment_variable.batch_upstash_redis_rest_url
  to   = module.project["batch"].vercel_project_environment_variable.this["upstash_redis_rest_url"]
}

moved {
  from = vercel_project_environment_variable.batch_upstash_redis_rest_url_dev
  to   = module.project["batch"].vercel_project_environment_variable.this["upstash_redis_rest_url_dev"]
}

moved {
  from = vercel_project_environment_variable.batch_google_api_key
  to   = module.project["batch"].vercel_project_environment_variable.this["google_api_key"]
}

moved {
  from = vercel_project_environment_variable.batch_google_api_key_development
  to   = module.project["batch"].vercel_project_environment_variable.this["google_api_key_development"]
}

moved {
  from = vercel_project_environment_variable.batch_cron_secret
  to   = module.project["batch"].vercel_project_environment_variable.this["cron_secret"]
}
