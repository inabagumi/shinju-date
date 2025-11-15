resource "vercel_project_domain" "this" {
  domain               = var.domain
  project_id           = var.project_id
  team_id              = var.team_id
  redirect             = var.redirect
  redirect_status_code = var.redirect_status_code
}
