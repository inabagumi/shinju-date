resource "vercel_dns_record" "digicert_caa" {
  domain  = "shinju.date"
  name    = "api"
  team_id = vercel_project.this.team_id
  ttl     = 60
  type    = "CAA"
  value   = "0 issue \"digicert.com\""
}

resource "vercel_dns_record" "google_site_verification" {
  domain  = "shinju.date"
  name    = ""
  team_id = vercel_project.this.team_id
  ttl     = 60
  type    = "TXT"
  value   = "google-site-verification=B-AnwaokGJSxLYWtDEFi_NDp-GxH-aLGAMT8SsxTFL4"
}

resource "vercel_dns_record" "api" {
  domain  = "shinju.date"
  name    = "api"
  team_id = vercel_project.this.team_id
  ttl     = 60
  type    = "CNAME"
  value   = "bxbalbupmqhcdqrmoiwl.supabase.co."
}
