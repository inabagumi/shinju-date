resource "vercel_project" "this" {
  enable_affected_projects_deployments = true
  framework                            = "nextjs"
  git_repository = {
    production_branch = "main"
    repo              = "inabagumi/shinju-date"
    type              = "github"
  }
  name                         = var.name
  node_version                 = "26.x"
  prioritise_production_builds = true
  root_directory               = var.root_directory
  resource_config = {
    function_default_regions  = ["hnd1"]
    function_default_cpu_type = var.function_default_cpu_type
    function_default_timeout  = var.function_default_timeout
  }
  team_id = var.team_id
  vercel_authentication = {
    deployment_type = "standard_protection"
  }
}

resource "vercel_project_environment_variable" "this" {
  for_each = var.environment_variables

  key        = each.value.key
  sensitive  = each.value.sensitive
  project_id = vercel_project.this.id
  target     = each.value.target
  team_id    = vercel_project.this.team_id
  value      = each.value.value
}

resource "vercel_project_deployment_retention" "this" {
  expiration_canceled   = "1m"
  expiration_errored    = "1m"
  expiration_preview    = "1m"
  expiration_production = "1m"
  project_id            = vercel_project.this.id
  team_id               = vercel_project.this.team_id
}
