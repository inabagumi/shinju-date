resource "vercel_project_domain" "date" {
  domain     = "shinju.date"
  project_id = vercel_project.this.id
  team_id    = vercel_project.this.team_id
}

resource "vercel_project_domain" "cafe" {
  domain               = "search.animare.cafe"
  project_id           = vercel_project.this.id
  redirect             = vercel_project_domain.date.domain
  redirect_status_code = 308
  team_id              = vercel_project.this.team_id
}

resource "vercel_project_domain" "ink" {
  domain               = "schedule.774.ink"
  project_id           = vercel_project.this.id
  redirect             = vercel_project_domain.date.domain
  redirect_status_code = 308
  team_id              = vercel_project.this.team_id
}

resource "vercel_project_domain" "admin" {
  domain     = "admin.shinju.date"
  project_id = vercel_project.admin.id
  team_id    = vercel_project.admin.team_id
}
