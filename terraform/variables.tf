variable "google_api_key" {}
variable "upstash_redis_rest_token" {}
variable "upstash_redis_rest_token_dev" {}
variable "upstash_redis_rest_url" {}
variable "upstash_redis_rest_url_dev" {}
variable "vercel_api_token" {}
variable "vercel_team_id" {}
variable "supabase_url" {}
variable "supabase_service_role_key" {
  sensitive = true
}
