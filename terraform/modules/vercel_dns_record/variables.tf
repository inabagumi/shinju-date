variable "domain" {
  description = "Domain name for the DNS record"
  type        = string
}

variable "name" {
  description = "DNS record name (subdomain)"
  type        = string
  default     = ""
}

variable "team_id" {
  description = "Vercel team ID"
  type        = string
}

variable "ttl" {
  description = "Time to live for the DNS record"
  type        = number
  default     = 60
}

variable "type" {
  description = "DNS record type (A, AAAA, CNAME, TXT, CAA, etc.)"
  type        = string
}

variable "value" {
  description = "DNS record value"
  type        = string
}
