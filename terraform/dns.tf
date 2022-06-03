resource "vercel_dns_record" "google_site_verification" {
  domain  = "shinju.date"
  name    = ""
  team_id = vercel_project.this.team_id
  ttl     = 60
  type    = "TXT"
  value   = "google-site-verification=B-AnwaokGJSxLYWtDEFi_NDp-GxH-aLGAMT8SsxTFL4"
}
