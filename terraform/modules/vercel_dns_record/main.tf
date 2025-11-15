resource "vercel_dns_record" "this" {
  domain  = var.domain
  name    = var.name
  team_id = var.team_id
  ttl     = var.ttl
  type    = var.type
  value   = var.value
}
