variable "google_api_key" {
  description = "batch が YouTube Data API を呼ぶための Google の API のキー"
  sensitive   = true
  type        = string
}

variable "upstash_redis_rest_token" {
  description = "本番の Upstash Redis の REST API のトークン"
  sensitive   = true
  type        = string
}

variable "upstash_redis_rest_token_dev" {
  description = "開発・プレビューの Upstash Redis の REST API のトークン"
  sensitive   = true
  type        = string
}

variable "upstash_redis_rest_url" {
  description = "本番の Upstash Redis の REST API の URL"
  type        = string
}

variable "upstash_redis_rest_url_dev" {
  description = "開発・プレビューの Upstash Redis の REST API の URL"
  type        = string
}

variable "vercel_api_token" {
  description = "Vercel の API のトークン"
  sensitive   = true
  type        = string
}

variable "vercel_team_id" {
  description = "プロジェクトを置く Vercel のチームの ID"
  type        = string
}
