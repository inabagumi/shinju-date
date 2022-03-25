terraform {
  cloud {
    organization = "inabagumi"

    workspaces {
      name = "shinju-date"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
}

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
    {
      key    = "IMGIX_BASE_PATH"
      target = ["production"]
      value  = "https://shinju-date.imgix.net"
    },
  ]
  framework = "nextjs"
  git_repository = {
    type = "github"
    repo = "inabagumi/shinju-date"
  }
  name          = "shinju-date"
  public_source = false
  team_id       = var.vercel_team_id
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
