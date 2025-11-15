variable "domain" {
  description = "Domain name to attach to the project"
  type        = string
}

variable "project_id" {
  description = "Vercel project ID"
  type        = string
}

variable "team_id" {
  description = "Vercel team ID"
  type        = string
}

variable "redirect" {
  description = "Domain to redirect to (optional)"
  type        = string
  default     = null
}

variable "redirect_status_code" {
  description = "HTTP status code for redirect (optional)"
  type        = number
  default     = null
}
