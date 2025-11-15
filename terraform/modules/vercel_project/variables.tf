variable "project_name" {
  description = "Name of the Vercel project"
  type        = string
}

variable "root_directory" {
  description = "Root directory of the application in the repository"
  type        = string
}

variable "framework" {
  description = "Framework type (nextjs, null, etc.)"
  type        = string
  default     = "nextjs"
}

variable "team_id" {
  description = "Vercel team ID"
  type        = string
}

variable "function_default_cpu_type" {
  description = "Default CPU type for serverless functions"
  type        = string
  default     = "standard"
}

variable "function_default_timeout" {
  description = "Default timeout for serverless functions in seconds"
  type        = number
  default     = 30
}

variable "environment_variables" {
  description = "Map of environment variables with their configuration"
  type = map(object({
    value  = string
    target = list(string)
  }))
  default = {}
}

variable "upstash_redis_rest_token" {
  description = "Upstash Redis REST token for production"
  type        = string
  default     = ""
}

variable "upstash_redis_rest_token_dev" {
  description = "Upstash Redis REST token for preview/development"
  type        = string
  default     = ""
}

variable "upstash_redis_rest_url" {
  description = "Upstash Redis REST URL for production"
  type        = string
  default     = ""
}

variable "upstash_redis_rest_url_dev" {
  description = "Upstash Redis REST URL for preview/development"
  type        = string
  default     = ""
}

variable "enable_redis" {
  description = "Whether to enable Upstash Redis environment variables"
  type        = bool
  default     = true
}

variable "enable_corepack" {
  description = "Whether to enable experimental corepack"
  type        = bool
  default     = true
}

variable "enable_bytecode_caching" {
  description = "Whether to enable bytecode caching in production"
  type        = bool
  default     = true
}

variable "deployment_retention" {
  description = "Deployment retention configuration"
  type = object({
    expiration_canceled   = string
    expiration_errored    = string
    expiration_preview    = string
    expiration_production = string
  })
  default = {
    expiration_canceled   = "1m"
    expiration_errored    = "1m"
    expiration_preview    = "1m"
    expiration_production = "unlimited"
  }
}
