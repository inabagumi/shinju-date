resource "vercel_dns_record" "google_site_verification" {
  domain  = "shinju.date"
  name    = ""
  team_id = vercel_project.this.team_id
  ttl     = 60
  type    = "TXT"
  value   = "google-site-verification=B-AnwaokGJSxLYWtDEFi_NDp-GxH-aLGAMT8SsxTFL4"
}

resource "vercel_dns_record" "digicert_caa" {
  domain  = "shinju.date"
  name    = "api"
  team_id = vercel_project.this.team_id
  ttl     = 60
  type    = "CAA"
  value   = "0 issue \"digicert.com\""
}

resource "vercel_dns_record" "supabase_verification2" {
  domain  = "shinju.date"
  name    = "api"
  team_id = vercel_project.this.team_id
  ttl     = 60
  type    = "TXT"
  value   = "ca3-4352c6a9ace743d1aee610af343f402d"
}

# resource "vercel_dns_record" "api" {
#   domain  = "shinju.date"
#   name    = "api"
#   team_id = vercel_project.this.team_id
#   ttl     = 60
#   type    = "CNAME"
#   value   = "bxbalbupmqhcdqrmoiwl.supabase.co."
# }

resource "vercel_dns_record" "supabase_verification" {
  domain  = "shinju.date"
  name    = "_cf-custom-hostname.api"
  team_id = vercel_project.this.team_id
  ttl     = 60
  type    = "TXT"
  value   = "62231763-ae47-41bd-aaa1-4c4ad223424d"
}
