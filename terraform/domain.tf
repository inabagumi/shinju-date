locals {
  domain = "shinju.date"
}

resource "vercel_project_domain" "date" {
  domain     = local.domain
  project_id = vercel_project.this["web"].id
  team_id    = vercel_project.this["web"].team_id
}

resource "vercel_project_domain" "cafe" {
  domain               = "search.animare.cafe"
  project_id           = vercel_project.this["web"].id
  redirect             = vercel_project_domain.date.domain
  redirect_status_code = 308
  team_id              = vercel_project.this["web"].team_id
}

resource "vercel_project_domain" "ink" {
  domain               = "schedule.774.ink"
  project_id           = vercel_project.this["web"].id
  redirect             = vercel_project_domain.date.domain
  redirect_status_code = 308
  team_id              = vercel_project.this["web"].team_id
}

resource "vercel_project_domain" "admin" {
  domain     = "admin.${local.domain}"
  project_id = vercel_project.this["admin"].id
  team_id    = vercel_project.this["admin"].team_id
}
