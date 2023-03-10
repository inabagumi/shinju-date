resource "vercel_project" "this" {
  environment = [
    {
      key    = "NEXT_PUBLIC_ALGOLIA_API_KEY"
      target = ["production", "preview", "development"]
      value  = var.algolia_api_key
    },
    {
      key    = "NEXT_PUBLIC_ALGOLIA_APPLICATION_ID"
      target = ["production", "preview", "development"]
      value  = var.algolia_application_id
    },
    {
      key    = "NEXT_PUBLIC_ALGOLIA_INDEX_NAME"
      target = ["production"]
      value  = "prod_videos"
    },
    {
      key    = "NEXT_PUBLIC_ALGOLIA_INDEX_NAME"
      target = ["preview", "development"]
      value  = "dev_videos"
    },
    {
      key    = "NEXT_PUBLIC_BASE_URL"
      target = ["production", "preview", "development"]
      value  = "https://shinju.date"
    },
    {
      key    = "NEXT_PUBLIC_GA_TRACKING_ID"
      target = ["production"]
      value  = "UA-167910717-1"
    },
    {
      key    = "NEXT_PUBLIC_GA_TRACKING_ID"
      target = ["preview", "development"]
      value  = "UA-167910717-2"
    },
    {
      key    = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      target = ["production", "preview", "development"]
      value  = var.supabase_anon_key
    },
    {
      key    = "NEXT_PUBLIC_SUPABASE_URL"
      target = ["production", "preview", "development"]
      value  = var.supabase_url
    },
  ]
  framework = "nextjs"
  git_repository = {
    production_branch = "main"
    repo              = "inabagumi/shinju-date"
    type              = "github"
  }
  name                       = "shinju-date"
  public_source              = false
  root_directory             = "apps/web"
  serverless_function_region = "hnd1"
  team_id                    = var.vercel_team_id
}

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

resource "vercel_project" "admin" {
  environment = [
    {
      key    = "NEXT_PUBLIC_ALGOLIA_API_KEY"
      target = ["production", "preview", "development"]
      value  = var.algolia_api_key
    },
    {
      key    = "NEXT_PUBLIC_ALGOLIA_APPLICATION_ID"
      target = ["production", "preview", "development"]
      value  = var.algolia_application_id
    },
    {
      key    = "NEXT_PUBLIC_ALGOLIA_INDEX_NAME"
      target = ["production"]
      value  = "prod_videos"
    },
    {
      key    = "NEXT_PUBLIC_ALGOLIA_INDEX_NAME"
      target = ["preview", "development"]
      value  = "dev_videos"
    },
    {
      key    = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      target = ["production", "preview", "development"]
      value  = var.supabase_anon_key
    },
    {
      key    = "NEXT_PUBLIC_SUPABASE_URL"
      target = ["production", "preview", "development"]
      value  = var.supabase_url
    },
    {
      key    = "UPSTASH_REDIS_REST_TOKEN"
      target = ["production", "preview", "development"]
      value  = var.upstash_redis_rest_token
    },
    {
      key    = "UPSTASH_REDIS_REST_URL"
      target = ["production", "preview", "development"]
      value  = var.upstash_redis_rest_url
    },
  ]
  framework = "nextjs"
  git_repository = {
    production_branch = "main"
    repo              = "inabagumi/shinju-date"
    type              = "github"
  }
  name                       = "shinju-date-admin"
  public_source              = false
  root_directory             = "apps/admin"
  serverless_function_region = "hnd1"
  team_id                    = var.vercel_team_id
}

resource "vercel_project_domain" "admin" {
  domain     = "admin.shinju.date"
  project_id = vercel_project.admin.id
  team_id    = vercel_project.admin.team_id
}
