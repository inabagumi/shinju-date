variable "google_api_key" {
  sensitive = true
  type      = string
}

variable "twitch_client_id" {
  type = string
}

variable "twitch_client_secret" {
  sensitive = true
  type      = string
}

variable "upstash_redis_rest_token" {
  sensitive = true
  type      = string
}

variable "upstash_redis_rest_token_dev" {
  sensitive = true
  type      = string
}

variable "upstash_redis_rest_url" {
  type = string
}

variable "upstash_redis_rest_url_dev" {
  type = string
}

variable "vercel_api_token" {
  sensitive = true
  type      = string
}

variable "vercel_team_id" {
  type = string
}
