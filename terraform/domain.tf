locals {
  domain = "shinju.date"
}

resource "vercel_project_domain" "date" {
  domain     = local.domain
  project_id = module.project["web"].id
  team_id    = module.project["web"].team_id
}

resource "vercel_project_domain" "cafe" {
  domain               = "search.animare.cafe"
  project_id           = module.project["web"].id
  redirect             = vercel_project_domain.date.domain
  redirect_status_code = 308
  team_id              = module.project["web"].team_id
}

resource "vercel_project_domain" "ink" {
  domain               = "schedule.774.ink"
  project_id           = module.project["web"].id
  redirect             = vercel_project_domain.date.domain
  redirect_status_code = 308
  team_id              = module.project["web"].team_id
}

resource "vercel_project_domain" "admin" {
  domain     = "admin.${local.domain}"
  project_id = module.project["admin"].id
  team_id    = module.project["admin"].team_id
}
