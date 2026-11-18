resource "vercel_dns_record" "digicert_caa" {
  domain  = local.domain
  name    = ""
  team_id = module.project["web"].team_id
  ttl     = 60
  type    = "CAA"
  value   = "0 issue \"digicert.com\""
}

resource "vercel_dns_record" "google_site_verification" {
  domain  = local.domain
  name    = ""
  team_id = module.project["web"].team_id
  ttl     = 60
  type    = "TXT"
  value   = "google-site-verification=B-AnwaokGJSxLYWtDEFi_NDp-GxH-aLGAMT8SsxTFL4"
}

resource "vercel_dns_record" "api" {
  domain  = local.domain
  name    = "api"
  team_id = module.project["web"].team_id
  ttl     = 60
  type    = "CNAME"
  value   = "bxbalbupmqhcdqrmoiwl.supabase.co."
}
