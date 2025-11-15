module "domain_date" {
  source = "./modules/vercel_project_domain"

  domain     = "shinju.date"
  project_id = module.web.project_id
  team_id    = module.web.team_id
}

module "domain_cafe" {
  source = "./modules/vercel_project_domain"

  domain               = "search.animare.cafe"
  project_id           = module.web.project_id
  team_id              = module.web.team_id
  redirect             = module.domain_date.domain
  redirect_status_code = 308
}

module "domain_ink" {
  source = "./modules/vercel_project_domain"

  domain               = "schedule.774.ink"
  project_id           = module.web.project_id
  team_id              = module.web.team_id
  redirect             = module.domain_date.domain
  redirect_status_code = 308
}

module "domain_admin" {
  source = "./modules/vercel_project_domain"

  domain     = "admin.shinju.date"
  project_id = module.admin.project_id
  team_id    = module.admin.team_id
}
