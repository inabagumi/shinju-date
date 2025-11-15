module "dns_digicert_caa" {
  source = "./modules/vercel_dns_record"

  domain  = "shinju.date"
  name    = ""
  team_id = module.web.team_id
  type    = "CAA"
  value   = "0 issue \"digicert.com\""
}

module "dns_google_site_verification" {
  source = "./modules/vercel_dns_record"

  domain  = "shinju.date"
  name    = ""
  team_id = module.web.team_id
  type    = "TXT"
  value   = "google-site-verification=B-AnwaokGJSxLYWtDEFi_NDp-GxH-aLGAMT8SsxTFL4"
}

module "dns_api" {
  source = "./modules/vercel_dns_record"

  domain  = "shinju.date"
  name    = "api"
  team_id = module.web.team_id
  type    = "CNAME"
  value   = "bxbalbupmqhcdqrmoiwl.supabase.co."
}
