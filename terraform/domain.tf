resource "vercel_project_domain" "date" {
  domain     = "shinju.date"
  project_id = module.web.project_id
  team_id    = module.web.team_id
}

resource "vercel_project_domain" "cafe" {
  domain               = "search.animare.cafe"
  project_id           = module.web.project_id
  redirect             = vercel_project_domain.date.domain
  redirect_status_code = 308
  team_id              = module.web.team_id
}

resource "vercel_project_domain" "ink" {
  domain               = "schedule.774.ink"
  project_id           = module.web.project_id
  redirect             = vercel_project_domain.date.domain
  redirect_status_code = 308
  team_id              = module.web.team_id
}

resource "vercel_project_domain" "admin" {
  domain     = "admin.shinju.date"
  project_id = module.admin.project_id
  team_id    = module.admin.team_id
}
